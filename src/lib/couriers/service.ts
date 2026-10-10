import "server-only";
import { Prisma, type ProviderMode, type Shipment, type ShipmentStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { decryptJson } from "@/lib/crypto";
import { HttpError } from "@/lib/api";
import { notifyStaff } from "@/lib/notify";
import { getSettings } from "@/lib/settings";
import { normalizeBdPhone } from "@/lib/phone";
import { enqueue } from "@/lib/jobs/queue";
import { mockAdapter } from "./mock";
import { steadfastAdapter, type SteadfastCreds } from "./steadfast";
import { pathaoAdapter, type PathaoConfig, type PathaoCreds } from "./pathao";
import { CourierError, type CourierAdapter } from "./types";

export const COURIERS = ["steadfast", "pathao"] as const;
export type CourierCode = (typeof COURIERS)[number];

/** Shipment states that block creating another booking for the same order. */
const ACTIVE: ShipmentStatus[] = ["REQUESTED", "BOOKED", "IN_TRANSIT", "HOLD", "DELIVERED", "PARTIAL_DELIVERED"];

export async function getAdapter(code: CourierCode): Promise<{ adapter: CourierAdapter; mode: ProviderMode }> {
  const p = await db.shippingProvider.findUnique({ where: { code } });
  if (!p) throw new HttpError(404, `Courier ${code} is not set up.`);
  if (!p.isEnabled) throw new HttpError(400, `${p.name} is disabled. Enable it in Settings → Delivery & couriers.`);
  if (p.mode === "MOCK") return { adapter: mockAdapter(code), mode: "MOCK" };
  if (!p.encryptedConfig) throw new HttpError(400, `${p.name} credentials are not configured.`);
  const cfg = p.publicConfig as Record<string, unknown>;
  if (code === "steadfast") {
    return { adapter: steadfastAdapter(decryptJson<SteadfastCreds>(p.encryptedConfig), { deliveryType: Number(cfg.deliveryType ?? 0) }), mode: p.mode };
  }
  const pc: PathaoConfig = {
    environment: p.mode === "LIVE" ? "production" : "sandbox",
    storeId: cfg.storeId ? Number(cfg.storeId) : null,
    deliveryType: Number(cfg.deliveryType ?? 48) === 12 ? 12 : 48,
    itemType: Number(cfg.itemType ?? 2) === 1 ? 1 : 2,
    itemWeightKg: Number(cfg.itemWeightKg ?? 0.5),
  };
  return { adapter: pathaoAdapter(decryptJson<PathaoCreds>(p.encryptedConfig), pc), mode: p.mode };
}

async function log(entry: { providerCode: string; operation: string; success: boolean; mode: ProviderMode; durationMs: number; error?: string | null; httpStatus?: number | null; shipmentId?: string | null; orderId?: string | null }) {
  await db.courierLog.create({ data: { ...entry, error: entry.error?.slice(0, 1000) ?? null } }).catch(() => {});
}

export type CreateShipmentOptions = { codAmountMinor?: number; note?: string; weightKg?: number; pathao?: { cityId: number; zoneId: number; areaId?: number | null } | null };

/**
 * Books a courier shipment for an order. Safe against double-clicks and concurrent staff:
 * the order row is locked, any active shipment blocks a new one, and a REQUESTED row is written
 * before the courier call so a crash mid-request can't produce an invisible duplicate.
 * The courier also receives our order number as its merchant invoice/reference.
 */
export async function createShipment(orderId: string, code: CourierCode, actorId: string | null, opts: CreateShipmentOptions = {}): Promise<Shipment> {
  const { adapter, mode } = await getAdapter(code);
  const shipment = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { shipments: true, address: true } });
    if (!order) throw new HttpError(404, "Order not found");
    if (!["CONFIRMED", "PROCESSING", "READY_TO_SHIP"].includes(order.status)) throw new HttpError(409, `Order must be confirmed before booking a courier (currently ${order.status.toLowerCase()}).`);
    const active = order.shipments.find((s) => ACTIVE.includes(s.status));
    if (active) throw new HttpError(409, `This order already has a ${active.providerCode} shipment (${active.status.toLowerCase()}${active.consignmentId ? `, ${active.consignmentId}` : ""}).`, "DUPLICATE");
    if (!order.address) throw new HttpError(400, "Order has no delivery address.");
    const cod = order.paymentStatus === "PAID" ? 0 : opts.codAmountMinor ?? order.totalMinor;
    if (cod < 0 || cod > order.totalMinor) throw new HttpError(400, "COD amount must be between 0 and the order total.");
    return tx.shipment.create({
      data: {
        orderId, providerCode: code, mode, status: "REQUESTED", codAmountMinor: cod, createdById: actorId,
        idempotencyKey: `${orderId}:${code}:${order.shipments.length + 1}`, attemptCount: order.shipments.length + 1,
      },
    });
  });

  const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { address: true, items: true } });
  const a = order.address!;
  const request = {
    invoice: order.number,
    recipientName: a.name,
    recipientPhone: normalizeBdPhone(a.phone) ?? a.phone,
    altPhone: a.altPhone,
    recipientEmail: order.email,
    address: a.line1,
    area: a.area,
    district: a.district,
    codAmountMinor: shipment.codAmountMinor,
    itemCount: order.items.reduce((s, i) => s + i.quantity, 0),
    itemDescription: order.items.map((i) => `${i.quantity}× ${i.productName} (${i.size})`).join(", "),
    note: opts.note ?? order.notes,
    weightKg: opts.weightKg,
    pathao: opts.pathao ?? (a.pathaoCityId && a.pathaoZoneId ? { cityId: a.pathaoCityId, zoneId: a.pathaoZoneId, areaId: a.pathaoAreaId } : null),
  };
  if (code === "pathao" && mode !== "MOCK" && !request.pathao) {
    await db.shipment.update({ where: { id: shipment.id }, data: { status: "FAILED", lastError: "Pathao city/zone not selected for this address." } });
    throw new HttpError(400, "Select the Pathao city and zone for this address before booking.");
  }
  const started = Date.now();
  try {
    const res = await adapter.createShipment(request);
    const updated = await db.$transaction(async (tx) => {
      const s = await tx.shipment.update({
        where: { id: shipment.id },
        data: {
          status: "BOOKED", consignmentId: res.consignmentId, trackingCode: res.trackingCode, providerStatus: res.providerStatus, deliveryFeeMinor: res.deliveryFeeMinor,
          bookedAt: new Date(), lastError: null, requestSummary: { ...request, recipientPhone: request.recipientPhone.replace(/\d(?=\d{3})/g, "•") } as Prisma.InputJsonValue,
          responseSummary: res.raw as Prisma.InputJsonValue,
          events: { create: { providerStatus: res.providerStatus, description: mode === "MOCK" ? "Mock booking created (no real courier)" : "Booked with courier", source: "booking" } },
        },
      });
      if (order.status !== "READY_TO_SHIP") {
        await tx.order.update({ where: { id: orderId }, data: { status: "READY_TO_SHIP" } });
        await tx.orderStatusEvent.create({ data: { orderId, status: "READY_TO_SHIP", note: `${mode === "MOCK" ? "[MOCK] " : ""}Courier booked: ${code}${res.trackingCode ? ` · ${res.trackingCode}` : ""}`, actorId } });
      }
      return s;
    });
    await log({ providerCode: code, operation: "create_shipment", success: true, mode, durationMs: Date.now() - started, shipmentId: shipment.id, orderId });
    return updated;
  } catch (e) {
    const err = e instanceof CourierError ? e : new CourierError((e as Error).message);
    const ambiguous = err.retryable;
    await db.shipment.update({
      where: { id: shipment.id },
      data: { status: "FAILED", lastError: `${err.message}${ambiguous ? " — the courier may still have received it; check the courier panel for invoice " + order.number + " before retrying." : ""}`.slice(0, 1000) },
    });
    await log({ providerCode: code, operation: "create_shipment", success: false, mode, durationMs: Date.now() - started, error: err.message, httpStatus: err.httpStatus, shipmentId: shipment.id, orderId });
    await notifyStaff({ type: "courier.failed", title: `Courier booking failed for ${order.number}`, body: err.message.slice(0, 140), link: `/admin/orders/${orderId}` });
    throw new HttpError(502, `Courier booking failed: ${err.message}`);
  }
}

const ORDER_FROM_SHIPMENT: Partial<Record<ShipmentStatus, "SHIPPED" | "DELIVERED" | "RETURNED">> = {
  IN_TRANSIT: "SHIPPED",
  DELIVERED: "DELIVERED",
  PARTIAL_DELIVERED: "DELIVERED",
  RETURNED: "RETURNED",
};

/**
 * Applies a verified courier status (webhook or poll). Customer-facing order status only moves
 * forward based on courier information; unknown statuses are recorded but change nothing.
 */
export async function applyCourierStatus(shipmentId: string, providerStatus: string, status: ShipmentStatus | null, source: "webhook" | "poll", raw: unknown, description?: string) {
  await db.$transaction(async (tx) => {
    const s = await tx.shipment.findUniqueOrThrow({ where: { id: shipmentId }, include: { order: true } });
    const changed = s.providerStatus !== providerStatus;
    if (changed) await tx.trackingEvent.create({ data: { shipmentId, providerStatus, description: description ?? providerStatus.replace(/[_.-]/g, " "), source, raw: raw as Prisma.InputJsonValue } });
    await tx.shipment.update({ where: { id: shipmentId }, data: { providerStatus, lastSyncedAt: new Date(), ...(status ? { status } : {}) } });
    const next = status ? ORDER_FROM_SHIPMENT[status] : undefined;
    const rank = ["PENDING", "CONFIRMED", "PROCESSING", "READY_TO_SHIP", "SHIPPED", "DELIVERED"];
    if (next && s.order.status !== next && s.order.status !== "CANCELLED" && (next === "RETURNED" || rank.indexOf(next) > rank.indexOf(s.order.status))) {
      await tx.order.update({
        where: { id: s.orderId },
        data: {
          status: next,
          ...(next === "SHIPPED" ? { shippedAt: new Date() } : {}),
          ...(next === "DELIVERED" ? { deliveredAt: new Date(), ...(s.order.paymentMethod === "COD" ? { paymentStatus: "PAID" as const } : {}) } : {}),
        },
      });
      await tx.orderStatusEvent.create({ data: { orderId: s.orderId, status: next, note: `Courier update (${s.providerCode}): ${providerStatus}` } });
    }
  });
}

/** Poll active, non-mock shipments for updates (used where webhooks aren't configured). */
export async function syncActiveShipments(limit = 50) {
  const shipments = await db.shipment.findMany({
    where: { status: { in: ["BOOKED", "IN_TRANSIT", "HOLD"] }, mode: { not: "MOCK" }, consignmentId: { not: null } },
    orderBy: { lastSyncedAt: { sort: "asc", nulls: "first" } },
    take: limit,
    include: { order: true },
  });
  let updated = 0;
  for (const s of shipments) {
    const started = Date.now();
    try {
      const { adapter, mode } = await getAdapter(s.providerCode as CourierCode);
      const r = await adapter.getStatus({ consignmentId: s.consignmentId!, trackingCode: s.trackingCode, invoice: s.order.number });
      await applyCourierStatus(s.id, r.providerStatus, r.status, "poll", r.raw);
      await log({ providerCode: s.providerCode, operation: "status", success: true, mode, durationMs: Date.now() - started, shipmentId: s.id });
      updated++;
    } catch (e) {
      await log({ providerCode: s.providerCode, operation: "status", success: false, mode: s.mode, durationMs: Date.now() - started, error: (e as Error).message, shipmentId: s.id });
    }
  }
  return updated;
}

/** Called when an order is confirmed: books automatically only if every configured condition holds. */
export async function maybeAutoBook(orderId: string) {
  const s = (await getSettings()).delivery;
  if (!s.autoBookEnabled || !s.autoBookProvider) return { queued: false, reason: "Auto-booking disabled" };
  const order = await db.order.findUnique({ where: { id: orderId }, include: { address: true } });
  if (!order?.address) return { queued: false, reason: "No address" };
  if (order.paymentMethod === "COD" && order.totalMinor > s.autoBookMaxCodMinor) return { queued: false, reason: "COD above auto-book limit" };
  if (!normalizeBdPhone(order.phone)) return { queued: false, reason: "Invalid phone" };
  if (s.autoBookProvider === "pathao" && !(order.address.pathaoCityId && order.address.pathaoZoneId)) return { queued: false, reason: "Pathao location not mapped" };
  await enqueue("courier.book", { orderId, provider: s.autoBookProvider }, { dedupeKey: `autobook:${orderId}`, maxAttempts: 1 });
  return { queued: true };
}
