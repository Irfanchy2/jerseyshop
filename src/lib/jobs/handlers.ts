import "server-only";
import { registerJobHandler } from "./queue";
import { processTryOnJob, purgeExpiredTryOns } from "@/lib/tryon/service";

registerJobHandler("tryon.generate", async (p) => processTryOnJob(String(p.tryOnJobId)));
registerJobHandler("tryon.purge", async () => {
  await purgeExpiredTryOns();
});
