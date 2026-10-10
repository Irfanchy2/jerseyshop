import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export type JobType = "tryon.generate" | "tryon.purge" | "courier.sync" | "courier.book";
type Handler = (payload: Record<string, unknown>) => Promise<void>;

const handlers = new Map<JobType, Handler>();
export function registerJobHandler(type: JobType, fn: Handler) {
  handlers.set(type, fn);
}

export async function enqueue(type: JobType, payload: Prisma.InputJsonValue, opts: { dedupeKey?: string; runAt?: Date; maxAttempts?: number } = {}) {
  if (opts.dedupeKey) {
    const existing = await db.job.findUnique({ where: { dedupeKey: opts.dedupeKey } });
    if (existing) return existing;
  }
  return db.job.create({ data: { type, payload, runAt: opts.runAt ?? new Date(), maxAttempts: opts.maxAttempts ?? 3, dedupeKey: opts.dedupeKey } });
}

/**
 * Claims due jobs with SKIP LOCKED so several workers can run safely, executes them and
 * reschedules failures with exponential backoff. Stale RUNNING jobs (crashed worker) are retried.
 */
export async function runDueJobs(limit = 10) {
  await loadHandlers();
  const claimed = await db.$queryRaw<{ id: string }[]>`
    UPDATE "Job" SET status = 'RUNNING', "lockedAt" = now(), attempts = attempts + 1, "updatedAt" = now()
    WHERE id IN (
      SELECT id FROM "Job"
      WHERE (status = 'PENDING' AND "runAt" <= now())
         OR (status = 'RUNNING' AND "lockedAt" < now() - interval '10 minutes')
      ORDER BY "runAt" ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id`;
  const results: { id: string; ok: boolean; error?: string }[] = [];
  for (const { id } of claimed) {
    const job = await db.job.findUniqueOrThrow({ where: { id } });
    const handler = handlers.get(job.type as JobType);
    try {
      if (!handler) throw new Error(`No handler for ${job.type}`);
      await handler(job.payload as Record<string, unknown>);
      await db.job.update({ where: { id }, data: { status: "SUCCEEDED", lockedAt: null, lastError: null } });
      results.push({ id, ok: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const dead = job.attempts >= job.maxAttempts || (e as { permanent?: boolean }).permanent;
      await db.job.update({
        where: { id },
        data: { status: dead ? "DEAD" : "PENDING", lockedAt: null, lastError: msg.slice(0, 1000), runAt: new Date(Date.now() + 2 ** job.attempts * 15_000) },
      });
      results.push({ id, ok: false, error: msg });
    }
  }
  return results;
}

/** Run one specific job right now (used right after enqueueing for snappy UX); safe with the queue lock. */
export async function runJobNow(id: string) {
  await loadHandlers();
  const claimed = await db.job.updateMany({ where: { id, status: "PENDING" }, data: { status: "RUNNING", lockedAt: new Date(), attempts: { increment: 1 } } });
  if (!claimed.count) return;
  const job = await db.job.findUniqueOrThrow({ where: { id } });
  try {
    await handlers.get(job.type as JobType)!(job.payload as Record<string, unknown>);
    await db.job.update({ where: { id }, data: { status: "SUCCEEDED", lockedAt: null } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const dead = job.attempts >= job.maxAttempts || (e as { permanent?: boolean }).permanent;
    await db.job.update({ where: { id }, data: { status: dead ? "DEAD" : "PENDING", lockedAt: null, lastError: msg.slice(0, 1000), runAt: new Date(Date.now() + 2 ** job.attempts * 15_000) } });
  }
}

export class PermanentJobError extends Error {
  permanent = true;
}

let loaded = false;
async function loadHandlers() {
  if (loaded) return;
  loaded = true;
  await import("./handlers");
}
