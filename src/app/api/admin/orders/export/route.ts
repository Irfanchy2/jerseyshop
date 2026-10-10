import type { OrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { handleApiError } from "@/lib/api";
import { toMajorString } from "@/lib/money";
import { audit } from "@/lib/audit";

const csvCell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  // Neutralise spreadsheet formula injection and quote.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

export async function GET(req: Request) {
  try {
    const staff = await requirePermission("orders.read");
    const status = new URL(req.url).searchParams.get("status") as OrderStatus | null;
    const orders = await db.order.findMany({ where: status ? { status } : {}, include: { address: true, items: true }, orderBy: { placedAt: "desc" }, take: 10000 });
    const header = ["number", "placed_at", "status", "payment_method", "payment_status", "customer", "phone", "email", "district", "area", "address", "items", "subtotal", "discount", "shipping", "total", "coupon"];
    const lines = orders.map((o) => [o.number, o.placedAt.toISOString(), o.status, o.paymentMethod, o.paymentStatus, o.customerName, o.phone, o.email, o.address?.district, o.address?.area, o.address?.line1, o.items.map((i) => `${i.quantity}x ${i.sku}`).join("; "), toMajorString(o.subtotalMinor), toMajorString(o.discountMinor), toMajorString(o.shippingMinor), toMajorString(o.totalMinor), o.couponCode].map(csvCell).join(","));
    await audit({ actorId: staff.id, action: "orders.export", entityType: "order", summary: `${orders.length} rows` });
    return new Response([header.join(","), ...lines].join("\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="orders-${new Date().toISOString().slice(0, 10)}.csv"` } });
  } catch (e) {
    return handleApiError(e);
  }
}
