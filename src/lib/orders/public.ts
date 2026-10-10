import "server-only";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { sha256, safeEqual } from "@/lib/crypto";
import { getCustomer } from "@/lib/auth/session";
import { normalizeBdPhone } from "@/lib/phone";

export const publicOrderInclude = {
  items: true,
  address: true,
  events: { where: { isPublic: true }, orderBy: { createdAt: "asc" as const } },
  shipments: { where: { status: { notIn: ["FAILED" as const, "REQUESTED" as const] } }, include: { events: { orderBy: { occurredAt: "asc" as const } } }, orderBy: { createdAt: "desc" as const } },
};

/** An order can be viewed by its account owner, or by the browser that placed it (tracking token cookie). */
export async function getOrderForViewer(number: string) {
  const order = await db.order.findUnique({ where: { number }, include: publicOrderInclude });
  if (!order) return null;
  const user = await getCustomer();
  if (user && order.userId === user.id) return order;
  const last = (await cookies()).get("js_last_order")?.value;
  if (last && order.trackingTokenHash) {
    const [num, token] = last.split(".");
    if (num === number && token && safeEqual(sha256(token), order.trackingTokenHash)) return order;
  }
  return null;
}

/** Guest tracking requires both the order number and the phone number used at checkout. */
export async function findOrderByNumberAndPhone(number: string, phone: string) {
  const p = normalizeBdPhone(phone);
  if (!p) return null;
  const order = await db.order.findUnique({ where: { number: number.trim().toUpperCase() }, include: publicOrderInclude });
  return order && order.phone === p ? order : null;
}

export const STATUS_STEPS = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"] as const;
export const STATUS_LABEL: Record<string, string> = {
  PENDING: "Order placed",
  CONFIRMED: "Confirmed",
  PROCESSING: "Being prepared",
  READY_TO_SHIP: "Ready to ship",
  SHIPPED: "With courier",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  RETURNED: "Returned",
};
