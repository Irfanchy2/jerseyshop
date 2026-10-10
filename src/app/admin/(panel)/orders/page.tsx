import Link from "next/link";
import type { Prisma, OrderStatus } from "@prisma/client";
import { Download } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/auth/guards";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/utils";
import { FilterTabs, PageHeader, Pagination, StatusBadge, Table, EmptyState } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Orders" };
const STATUSES: OrderStatus[] = ["PENDING", "CONFIRMED", "PROCESSING", "READY_TO_SHIP", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED"];
const PER = 25;

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string; payment?: string }> }) {
  await requireStaffPage("orders.read");
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as OrderStatus) ? (sp.status as OrderStatus) : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const q = sp.q?.trim();
  const where: Prisma.OrderWhereInput = {
    ...(status ? { status } : {}),
    ...(sp.payment === "COD" || sp.payment === "SSLCOMMERZ" ? { paymentMethod: sp.payment } : {}),
    ...(q ? { OR: [{ number: { contains: q, mode: "insensitive" } }, { phone: { contains: q.replace(/\D/g, "") || q } }, { customerName: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {}),
  };
  const [orders, total, counts] = await Promise.all([
    db.order.findMany({ where, orderBy: { placedAt: "desc" }, skip: (page - 1) * PER, take: PER, include: { address: true, _count: { select: { items: true } }, shipments: { where: { status: { not: "FAILED" } }, take: 1, orderBy: { createdAt: "desc" } } } }),
    db.order.count({ where }),
    db.order.groupBy({ by: ["status"], _count: true }),
  ]);
  const countOf = (s?: OrderStatus) => (s ? counts.find((c) => c.status === s)?._count ?? 0 : counts.reduce((a, c) => a + c._count, 0));
  const qs = (o: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { status: sp.status, q: sp.q, payment: sp.payment, ...o };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    return `/admin/orders${p.toString() ? `?${p}` : ""}`;
  };
  return (
    <div>
      <PageHeader title="Orders" description={`${total} order${total === 1 ? "" : "s"}`} actions={<Button asChild variant="outline" size="sm"><a href={`/api/admin/orders/export${status ? `?status=${status}` : ""}`}><Download className="h-4 w-4" /> Export CSV</a></Button>} />
      <FilterTabs active={status ?? "ALL"} items={[{ key: "ALL", label: "All", href: qs({ status: undefined, page: undefined }), count: countOf() }, ...STATUSES.map((s) => ({ key: s, label: s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " "), href: qs({ status: s, page: undefined }), count: countOf(s) }))]} />
      <form className="mb-4 flex flex-wrap gap-2">
        {status && <input type="hidden" name="status" value={status} />}
        <input name="q" defaultValue={q} placeholder="Search order #, phone, name, email" className="h-9 w-72 rounded-lg border border-border bg-surface px-3 text-sm" />
        <select name="payment" defaultValue={sp.payment ?? ""} className="h-9 rounded-lg border border-border bg-surface px-3 text-sm"><option value="">All payments</option><option value="COD">Cash on Delivery</option><option value="SSLCOMMERZ">Online</option></select>
        <Button size="sm" variant="secondary" type="submit">Filter</Button>
      </form>
      {orders.length === 0 ? <EmptyState title="No orders found" body="Try a different filter or search." /> : (
        <Table>
          <thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>Destination</th><th>Items</th><th>Payment</th><th>Status</th><th>Courier</th><th className="text-right">Total</th></tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td><Link href={`/admin/orders/${o.id}`} className="font-mono font-semibold hover:underline">{o.number}</Link>{o.isDemo && <span className="ml-1.5 rounded bg-amber-500/15 px-1 text-[10px] font-semibold text-amber-700 dark:text-amber-300">DEMO</span>}</td>
                <td className="whitespace-nowrap text-muted-foreground">{formatDateTime(o.placedAt)}</td>
                <td><span className="block font-medium">{o.customerName}</span><span className="text-[12px] text-muted-foreground">{o.phone}</span></td>
                <td className="text-muted-foreground">{o.address?.district}</td>
                <td className="tabular">{o._count.items}</td>
                <td><span className="text-[12px]">{o.paymentMethod === "COD" ? "COD" : "Online"}</span> <StatusBadge status={o.paymentStatus} /></td>
                <td><StatusBadge status={o.status} /></td>
                <td className="text-[12px] text-muted-foreground">{o.shipments[0] ? <span className="capitalize">{o.shipments[0].providerCode}{o.shipments[0].mode === "MOCK" ? " (mock)" : ""}</span> : "—"}</td>
                <td className="text-right font-medium tabular">{formatMoney(o.totalMinor)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Pagination page={page} pages={Math.ceil(total / PER)} href={(p) => qs({ page: String(p) })} />
    </div>
  );
}
