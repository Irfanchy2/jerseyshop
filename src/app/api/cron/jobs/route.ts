import { safeEqual } from "@/lib/crypto";
import { enqueue, runDueJobs } from "@/lib/jobs/queue";

/**
 * Background worker tick. Call every minute from a scheduler (Vercel Cron, system cron, GitHub Actions…):
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://your-domain/api/cron/jobs
 * Runs due jobs (try-on generation retries, courier sync/booking) and schedules retention purges.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) return new Response("Unauthorized", { status: 401 });
  const hour = new Date().toISOString().slice(0, 13);
  await enqueue("tryon.purge", {}, { dedupeKey: `tryon.purge:${hour}` });
  await enqueue("courier.sync", {}, { dedupeKey: `courier.sync:${new Date().toISOString().slice(0, 15)}` }); // every ~10 minutes
  const results = await runDueJobs(25);
  return Response.json({ ran: results.length, failed: results.filter((r) => !r.ok).length });
}
