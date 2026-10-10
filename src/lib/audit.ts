import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { clientIp } from "@/lib/auth/session";
import { hashIp } from "@/lib/crypto";

export async function audit(params: {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary?: string;
  diff?: Prisma.InputJsonValue;
}) {
  try {
    await db.auditLog.create({
      data: {
        actorId: params.actorId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        summary: params.summary,
        diff: params.diff,
        ipHash: hashIp(await clientIp().catch(() => null)),
      },
    });
  } catch (e) {
    console.error("audit log failed", e);
  }
}

/** Strip secret-looking keys before writing to audit diffs or logs. */
export function redact<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(redact) as T;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    out[k] = /secret|password|token|key|credential/i.test(k) ? "[redacted]" : redact(v);
  }
  return out as T;
}
