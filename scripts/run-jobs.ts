/**
 * Long-running background worker (alternative to calling /api/cron/jobs from a scheduler).
 *   npm run jobs:run
 * Processes try-on generation retries, courier status sync/booking and retention purges.
 */
import { enqueue, runDueJobs } from "../src/lib/jobs/queue";

async function tick() {
  const now = new Date().toISOString();
  await enqueue("tryon.purge", {}, { dedupeKey: `tryon.purge:${now.slice(0, 13)}` });
  await enqueue("courier.sync", {}, { dedupeKey: `courier.sync:${now.slice(0, 15)}` });
  const results = await runDueJobs(25);
  if (results.length) console.log(`[jobs] ${now} ran ${results.length}, failed ${results.filter((r) => !r.ok).length}`);
}

async function main() {
  console.log("[jobs] worker started");
  for (;;) {
    await tick().catch((e) => console.error("[jobs] tick failed", e));
    await new Promise((r) => setTimeout(r, 30_000));
  }
}
main();
