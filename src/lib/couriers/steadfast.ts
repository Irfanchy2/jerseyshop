import "server-only";
import { courierFetch } from "./http";
import { CourierError, type CourierAdapter, type ShipmentRequest, type StatusResult } from "./types";
import type { ShipmentStatus } from "@prisma/client";

/**
 * Steadfast Courier (packzy) merchant API v1.
 *   Base: https://portal.packzy.com/api/v1 — headers: Api-Key, Secret-Key
 *   POST /create_order, POST /create_order/bulk-order, GET /status_by_cid/{id},
 *   GET /status_by_invoice/{invoice}, GET /status_by_trackingcode/{code}, GET /get_balance,
 *   POST /create_return_request, GET /get_return_request/{id}
 * Endpoint shapes were cross-checked against published SDK sources because the official
 * documentation requires a merchant login. Verify against your merchant panel docs before go-live.
 */
const BASE = "https://portal.packzy.com/api/v1";

export type SteadfastCreds = { apiKey: string; secretKey: string };

export function mapSteadfastStatus(s: string): ShipmentStatus | null {
  switch (s) {
    case "delivered":
    case "delivered_approval_pending":
      return "DELIVERED";
    case "partial_delivered":
    case "partial_delivered_approval_pending":
      return "PARTIAL_DELIVERED";
    case "cancelled":
    case "cancelled_approval_pending":
      return "CANCELLED";
    case "hold":
      return "HOLD";
    case "pending":
    case "in_review":
      return "IN_TRANSIT";
    default:
      return null; // unknown statuses don't change our state
  }
}

export function steadfastAdapter(creds: SteadfastCreds, defaults: { deliveryType?: number }): CourierAdapter {
  const headers = { "Api-Key": creds.apiKey, "Secret-Key": creds.secretKey };
  return {
    code: "steadfast",
    async createShipment(r: ShipmentRequest) {
      const body = {
        invoice: r.invoice,
        recipient_name: r.recipientName.slice(0, 100),
        recipient_phone: r.recipientPhone,
        alternative_phone: r.altPhone ?? undefined,
        recipient_email: r.recipientEmail ?? undefined,
        recipient_address: `${r.address}, ${r.area}, ${r.district}`.slice(0, 250),
        cod_amount: Math.round(r.codAmountMinor / 100), // whole BDT
        note: r.note?.slice(0, 200) ?? undefined,
        item_description: r.itemDescription.slice(0, 200),
        total_lot: r.itemCount,
        delivery_type: defaults.deliveryType ?? 0, // 0 = home delivery, 1 = point delivery
      };
      const { data } = await courierFetch<{ status: number; message: string; consignment?: { consignment_id: number; tracking_code: string; status: string } }>(`${BASE}/create_order`, { method: "POST", headers, body: JSON.stringify(body) });
      if (data.status !== 200 || !data.consignment) throw new CourierError(`Steadfast rejected the order: ${data.message}`, data.status, false, data);
      return { consignmentId: String(data.consignment.consignment_id), trackingCode: data.consignment.tracking_code, providerStatus: data.consignment.status, deliveryFeeMinor: null, raw: data };
    },
    async getStatus(ref): Promise<StatusResult> {
      const { data } = await courierFetch<{ status: number; delivery_status: string }>(`${BASE}/status_by_cid/${encodeURIComponent(ref.consignmentId)}`, { headers });
      return { providerStatus: data.delivery_status, status: mapSteadfastStatus(data.delivery_status), raw: data };
    },
    async testConnection() {
      const { data } = await courierFetch<{ status: number; current_balance: number }>(`${BASE}/get_balance`, { headers });
      return data.status === 200
        ? { ok: true, message: `Connected. Current balance: ৳${data.current_balance}`, details: { balance: data.current_balance } }
        : { ok: false, message: "Unexpected response from Steadfast." };
    },
  };
}

/** Return request for a delivered consignment (Steadfast "create_return_request"). */
export async function steadfastReturnRequest(creds: SteadfastCreds, consignmentId: string, reason: string) {
  const { data } = await courierFetch<{ id: number; status: string }>(`${BASE}/create_return_request`, {
    method: "POST",
    headers: { "Api-Key": creds.apiKey, "Secret-Key": creds.secretKey },
    body: JSON.stringify({ consignment_id: Number(consignmentId), reason }),
  });
  return data;
}
