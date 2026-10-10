import { db } from "@/lib/db";
import { decryptJson, safeEqual } from "@/lib/crypto";
import { applyCourierStatus } from "@/lib/couriers/service";
import { mapPathaoStatus } from "@/lib/couriers/pathao";

/**
 * Pathao merchant webhook: https://<your-domain>/api/webhooks/pathao
 * Verifies X-PATHAO-Signature against the webhook secret configured in Admin, and echoes the
 * integration secret header Pathao expects in every response.
 */
export async function POST(req: Request) {
  const provider = await db.shippingProvider.findUnique({ where: { code: "pathao" } });
  const cfg = (provider?.publicConfig ?? {}) as { webhookIntegrationSecret?: string };
  const headers = { "X-Pathao-Merchant-Webhook-Integration-Secret": cfg.webhookIntegrationSecret || "f3992ecc-59da-4cbe-a049-a13da2018d51" };
  const creds = provider?.encryptedConfig ? decryptJson<{ webhookSecret?: string }>(provider.encryptedConfig) : null;
  const sig = req.headers.get("x-pathao-signature") ?? "";
  if (!creds?.webhookSecret || !safeEqual(sig, creds.webhookSecret)) return Response.json({ status: "error", message: "Invalid signature" }, { status: 401, headers });
  const body = (await req.json().catch(() => null)) as { event?: string; consignment_id?: string; merchant_order_id?: string } | null;
  if (!body?.event) return Response.json({ status: "error", message: "Invalid payload" }, { status: 400, headers });
  const shipment = body.consignment_id ? await db.shipment.findFirst({ where: { providerCode: "pathao", consignmentId: String(body.consignment_id) } }) : null;
  if (shipment) await applyCourierStatus(shipment.id, body.event, mapPathaoStatus(body.event), "webhook", body);
  return Response.json({ status: "success", message: "Webhook received" }, { status: 202, headers });
}
