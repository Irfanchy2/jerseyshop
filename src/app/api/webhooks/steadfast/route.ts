import { db } from "@/lib/db";
import { decryptJson, safeEqual } from "@/lib/crypto";
import { applyCourierStatus } from "@/lib/couriers/service";
import { mapSteadfastStatus } from "@/lib/couriers/steadfast";

/**
 * Steadfast webhook. Configure the callback URL in the Steadfast merchant panel as
 *   https://<your-domain>/api/webhooks/steadfast
 * with the Bearer token you set in Admin → Delivery & couriers → Steadfast → Webhook token.
 */
export async function POST(req: Request) {
  const provider = await db.shippingProvider.findUnique({ where: { code: "steadfast" } });
  const creds = provider?.encryptedConfig ? decryptJson<{ webhookToken?: string }>(provider.encryptedConfig) : null;
  const auth = req.headers.get("authorization") ?? "";
  if (!creds?.webhookToken || !safeEqual(auth, `Bearer ${creds.webhookToken}`)) return Response.json({ status: "error", message: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { notification_type?: string; consignment_id?: number; invoice?: string; status?: string; tracking_message?: string } | null;
  if (!body?.consignment_id) return Response.json({ status: "error", message: "Invalid payload" }, { status: 400 });
  const shipment = await db.shipment.findFirst({ where: { providerCode: "steadfast", consignmentId: String(body.consignment_id) } });
  if (!shipment) return Response.json({ status: "error", message: "Unknown consignment" }, { status: 404 });
  if (body.notification_type === "delivery_status" && body.status) {
    await applyCourierStatus(shipment.id, body.status, mapSteadfastStatus(body.status), "webhook", body, body.tracking_message);
  } else if (body.tracking_message) {
    await applyCourierStatus(shipment.id, shipment.providerStatus ?? "tracking_update", null, "webhook", body, body.tracking_message);
  }
  return Response.json({ status: "success", message: "Webhook received" });
}
