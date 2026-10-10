import "server-only";
import { registerJobHandler } from "./queue";
import { processTryOnJob, purgeExpiredTryOns } from "@/lib/tryon/service";

registerJobHandler("tryon.generate", async (p) => processTryOnJob(String(p.tryOnJobId)));
registerJobHandler("tryon.purge", async () => {
  await purgeExpiredTryOns();
});

registerJobHandler("courier.sync", async () => {
  const { syncActiveShipments } = await import("@/lib/couriers/service");
  await syncActiveShipments();
});
registerJobHandler("courier.book", async (p) => {
  const { createShipment } = await import("@/lib/couriers/service");
  // maxAttempts=1: a failed auto-booking is surfaced to staff instead of being retried blindly.
  await createShipment(String(p.orderId), p.provider as "steadfast" | "pathao", null);
});
