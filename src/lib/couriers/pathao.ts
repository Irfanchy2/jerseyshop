import "server-only";
import { db } from "@/lib/db";
import { decryptJson, encryptJson } from "@/lib/crypto";
import { courierFetch } from "./http";
import { CourierError, type CourierAdapter, type ShipmentRequest, type StatusResult } from "./types";
import type { ShipmentStatus } from "@prisma/client";

/**
 * Pathao Courier Merchant API ("aladdin").
 *   Sandbox: https://courier-api-sandbox.pathao.com · Production: https://api-hermes.pathao.com
 *   POST /aladdin/api/v1/issue-token (grant_type password | refresh_token)
 *   GET  /aladdin/api/v1/city-list · /cities/{id}/zone-list · /zones/{id}/area-list · /stores
 *   POST /aladdin/api/v1/orders · /orders/bulk · /merchant/price-plan
 *   GET  /aladdin/api/v1/orders/{consignment_id}/info
 * Shapes cross-checked against published SDK sources (official docs require merchant access).
 */
export type PathaoCreds = { clientId: string; clientSecret: string; username: string; password: string };
export type PathaoConfig = { environment: "sandbox" | "production"; storeId: number | null; deliveryType: 48 | 12; itemType: 1 | 2; itemWeightKg: number };

const BASES = { sandbox: "https://courier-api-sandbox.pathao.com", production: "https://api-hermes.pathao.com" };

type Token = { access_token: string; refresh_token: string; expires_in: number };

/** Issues or refreshes the OAuth token and stores it encrypted on the provider row. */
async function accessToken(creds: PathaoCreds, cfg: PathaoConfig): Promise<string> {
  const row = await db.shippingProvider.findUniqueOrThrow({ where: { code: "pathao" } });
  const base = BASES[cfg.environment];
  if (row.encryptedToken && row.tokenExpiresAt && row.tokenExpiresAt.getTime() > Date.now() + 5 * 60_000) {
    return decryptJson<Token>(row.encryptedToken).access_token;
  }
  let token: Token | null = null;
  if (row.encryptedToken) {
    try {
      const old = decryptJson<Token>(row.encryptedToken);
      token = (await courierFetch<Token>(`${base}/aladdin/api/v1/issue-token`, {
        method: "POST",
        body: JSON.stringify({ client_id: creds.clientId, client_secret: creds.clientSecret, grant_type: "refresh_token", refresh_token: old.refresh_token }),
      })).data;
    } catch {
      token = null; // fall back to password grant
    }
  }
  if (!token) {
    token = (await courierFetch<Token>(`${base}/aladdin/api/v1/issue-token`, {
      method: "POST",
      body: JSON.stringify({ client_id: creds.clientId, client_secret: creds.clientSecret, grant_type: "password", username: creds.username, password: creds.password }),
    })).data;
  }
  if (!token?.access_token) throw new CourierError("Pathao did not return an access token.");
  await db.shippingProvider.update({ where: { code: "pathao" }, data: { encryptedToken: encryptJson(token), tokenExpiresAt: new Date(Date.now() + token.expires_in * 1000) } });
  return token.access_token;
}

export function mapPathaoStatus(slug: string): ShipmentStatus | null {
  const s = slug.toLowerCase().replace(/^order\./, "").replace(/_/g, "-");
  if (s === "delivered") return "DELIVERED";
  if (s === "partial-delivery" || s === "partial-delivered") return "PARTIAL_DELIVERED";
  if (s === "returned" || s === "paid-return") return "RETURNED";
  if (s === "pickup-cancelled" || s === "cancelled") return "CANCELLED";
  if (s === "on-hold" || s === "hold") return "HOLD";
  if (["picked", "at-the-sorting-hub", "in-transit", "received-at-last-mile-hub", "assigned-for-delivery", "delivery-failed"].includes(s)) return "IN_TRANSIT";
  if (["created", "pending", "pickup-requested", "assigned-for-pickup", "updated", "pickup-failed"].includes(s)) return "BOOKED";
  return null;
}

export function pathaoAdapter(creds: PathaoCreds, cfg: PathaoConfig): CourierAdapter {
  const base = BASES[cfg.environment];
  const auth = async () => ({ Authorization: `Bearer ${await accessToken(creds, cfg)}` });
  return {
    code: "pathao",
    async createShipment(r: ShipmentRequest) {
      if (!cfg.storeId) throw new CourierError("Pathao store ID is not configured (Settings → Delivery & couriers → Pathao).");
      const body = {
        store_id: cfg.storeId,
        merchant_order_id: r.invoice,
        recipient_name: r.recipientName.slice(0, 100),
        recipient_phone: r.recipientPhone,
        recipient_secondary_phone: r.altPhone ?? undefined,
        recipient_address: `${r.address}, ${r.area}, ${r.district}`.slice(0, 220),
        recipient_city: r.pathao?.cityId,
        recipient_zone: r.pathao?.zoneId,
        recipient_area: r.pathao?.areaId ?? undefined,
        delivery_type: cfg.deliveryType,
        item_type: cfg.itemType,
        special_instruction: r.note?.slice(0, 200) ?? undefined,
        item_quantity: r.itemCount,
        item_weight: r.weightKg ?? cfg.itemWeightKg,
        item_description: r.itemDescription.slice(0, 200),
        amount_to_collect: Math.round(r.codAmountMinor / 100),
      };
      const { data } = await courierFetch<{ code: number; message: string; data?: { consignment_id: string; order_status: string; delivery_fee: number } }>(`${base}/aladdin/api/v1/orders`, { method: "POST", headers: await auth(), body: JSON.stringify(body) });
      if (!data.data?.consignment_id) throw new CourierError(`Pathao rejected the order: ${data.message}`, data.code, false, data);
      return { consignmentId: data.data.consignment_id, trackingCode: data.data.consignment_id, providerStatus: data.data.order_status, deliveryFeeMinor: Math.round((data.data.delivery_fee ?? 0) * 100), raw: data };
    },
    async getStatus(ref): Promise<StatusResult> {
      const { data } = await courierFetch<{ data: { order_status: string; order_status_slug?: string } }>(`${base}/aladdin/api/v1/orders/${encodeURIComponent(ref.consignmentId)}/info`, { headers: await auth() });
      const slug = data.data.order_status_slug ?? data.data.order_status;
      return { providerStatus: slug, status: mapPathaoStatus(slug), raw: data };
    },
    async testConnection() {
      const { data } = await courierFetch<{ data: { data: { store_id: number; store_name: string }[] } }>(`${base}/aladdin/api/v1/stores`, { headers: await auth() });
      const stores = data.data?.data ?? [];
      return { ok: true, message: `Connected. ${stores.length} store(s) found.`, details: { stores: stores.map((s) => ({ id: s.store_id, name: s.store_name })) } };
    },
  };
}

/** Location lookups for district/zone/area mapping (admin only). */
export async function pathaoLocations(creds: PathaoCreds, cfg: PathaoConfig, kind: "cities" | "zones" | "areas", parentId?: number) {
  const base = BASES[cfg.environment];
  const headers = { Authorization: `Bearer ${await accessToken(creds, cfg)}` };
  const path = kind === "cities" ? "/aladdin/api/v1/city-list" : kind === "zones" ? `/aladdin/api/v1/cities/${parentId}/zone-list` : `/aladdin/api/v1/zones/${parentId}/area-list`;
  const { data } = await courierFetch<{ data: { data: Record<string, unknown>[] } }>(`${base}${path}`, { headers });
  return data.data?.data ?? [];
}

export async function pathaoPriceQuote(creds: PathaoCreds, cfg: PathaoConfig, cityId: number, zoneId: number, weightKg: number) {
  const base = BASES[cfg.environment];
  const { data } = await courierFetch<{ data: { final_price: number } }>(`${base}/aladdin/api/v1/merchant/price-plan`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken(creds, cfg)}` },
    body: JSON.stringify({ store_id: cfg.storeId, item_type: cfg.itemType, delivery_type: cfg.deliveryType, item_weight: weightKg, recipient_city: cityId, recipient_zone: zoneId }),
  });
  return Math.round((data.data?.final_price ?? 0) * 100);
}
