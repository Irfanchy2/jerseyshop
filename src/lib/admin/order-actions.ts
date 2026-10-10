"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { staffAction, fail, type ActionResult } from "./guard";
import { restockOrder } from "@/lib/checkout/place-order";
import { createShipment, maybeAutoBook, syncActiveShipments, type CourierCode } from "@/lib/couriers/service";
import { HttpError } from "@/lib/api";
import { ALLOWED_TRANSITIONS } from "@/lib/orders/transitions";

const statusSchema = z.object({ orderId: z.string(), status: z.enum(["PENDING", "CONFIRMED", "PROCESSING", "READY_TO_SHIP", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED"]), note: z.string().max(500).optional(), restock: z.boolean().optional() });

export async function updateOrderStatusAction(input: z.infer<typeof statusSchema>): Promise<ActionResult> {
  try {
    const staff = await staffAction("orders.write");
    const data = statusSchema.parse(input);
    let autoBook = false;
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${data.orderId} FOR UPDATE`;
      const order = await tx.order.findUniqueOrThrow({ where: { id: data.orderId } });
      if (!ALLOWED_TRANSITIONS[order.status].includes(data.status)) throw new HttpError(409, `Can't change an order from ${order.status.toLowerCase()} to ${data.status.toLowerCase()}.`);
      const now = new Date();
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: data.status,
          ...(data.status === "CONFIRMED" ? { confirmedAt: now } : {}),
          ...(data.status === "SHIPPED" ? { shippedAt: now } : {}),
          ...(data.status === "DELIVERED" ? { deliveredAt: now, ...(order.paymentMethod === "COD" ? { paymentStatus: "PAID" as const } : {}) } : {}),
          ...(data.status === "CANCELLED" ? { cancelledAt: now } : {}),
        },
      });
      await tx.orderStatusEvent.create({ data: { orderId: order.id, status: data.status, note: data.note || null, actorId: staff.id } });
      // Stock goes back on cancellation (never shipped) or, when chosen, on return.
      if (data.status === "CANCELLED" || (data.status === "RETURNED" && data.restock)) await restockOrder(tx, order.id, data.status === "CANCELLED" ? "cancel" : "return", staff.id);
      autoBook = data.status === "CONFIRMED";
    });
    await audit({ actorId: staff.id, action: "order.status", entityType: "order", entityId: data.orderId, summary: `→ ${data.status}`, diff: { note: data.note ?? null } });
    let message = `Order marked ${data.status.toLowerCase().replace(/_/g, " ")}.`;
    if (autoBook) {
      const r = await maybeAutoBook(data.orderId);
      if (r.queued) message += " Courier auto-booking queued.";
    }
    revalidatePath(`/admin/orders/${data.orderId}`);
    revalidatePath("/admin/orders");
    return { ok: true, message };
  } catch (e) {
    return fail(e);
  }
}

export async function saveAdminNotesAction(orderId: string, notes: string): Promise<ActionResult> {
  try {
    const staff = await staffAction("orders.write");
    await db.order.update({ where: { id: orderId }, data: { adminNotes: notes.slice(0, 2000) } });
    await audit({ actorId: staff.id, action: "order.notes", entityType: "order", entityId: orderId });
    revalidatePath(`/admin/orders/${orderId}`);
    return { ok: true, message: "Notes saved." };
  } catch (e) {
    return fail(e);
  }
}

const shipSchema = z.object({
  orderId: z.string(),
  provider: z.enum(["steadfast", "pathao"]),
  codAmount: z.coerce.number().min(0),
  note: z.string().max(200).optional(),
  weightKg: z.coerce.number().min(0.1).max(30).optional(),
  pathaoCityId: z.coerce.number().int().optional(),
  pathaoZoneId: z.coerce.number().int().optional(),
  pathaoAreaId: z.coerce.number().int().optional(),
});

export async function createShipmentAction(input: z.infer<typeof shipSchema>): Promise<ActionResult> {
  try {
    const staff = await staffAction("shipping.write");
    const d = shipSchema.parse(input);
    if (d.pathaoCityId && d.pathaoZoneId) {
      await db.orderAddress.update({ where: { orderId: d.orderId }, data: { pathaoCityId: d.pathaoCityId, pathaoZoneId: d.pathaoZoneId, pathaoAreaId: d.pathaoAreaId ?? null } });
    }
    const s = await createShipment(d.orderId, d.provider as CourierCode, staff.id, {
      codAmountMinor: Math.round(d.codAmount * 100),
      note: d.note,
      weightKg: d.weightKg,
      pathao: d.pathaoCityId && d.pathaoZoneId ? { cityId: d.pathaoCityId, zoneId: d.pathaoZoneId, areaId: d.pathaoAreaId ?? null } : null,
    });
    await audit({ actorId: staff.id, action: "shipment.create", entityType: "order", entityId: d.orderId, summary: `${d.provider} ${s.consignmentId} (${s.mode})` });
    revalidatePath(`/admin/orders/${d.orderId}`);
    return { ok: true, message: `${s.mode === "MOCK" ? "Mock shipment" : "Shipment"} booked: ${s.consignmentId}`, id: s.id };
  } catch (e) {
    revalidatePath(`/admin/orders/${input.orderId}`);
    return fail(e);
  }
}

export async function syncShipmentsAction(): Promise<ActionResult> {
  try {
    const staff = await staffAction("shipping.write");
    const n = await syncActiveShipments(100);
    await audit({ actorId: staff.id, action: "shipment.sync", entityType: "shipment", summary: `${n} updated` });
    revalidatePath("/admin/shipping");
    return { ok: true, message: `Checked courier status for ${n} shipment(s).` };
  } catch (e) {
    return fail(e);
  }
}
