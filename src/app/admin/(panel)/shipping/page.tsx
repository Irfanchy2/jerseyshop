import Link from "next/link";
import type { ShipmentStatus } from "@prisma/client";
import { Settings2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/auth/guards";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/utils";
import { EmptyState, FilterTabs, PageHeader, StatusBadge, Table } from "@/components/admin/ui";
import { SyncShipments } from "@/components/admin/sales-forms";
import { Button } from "@/components/ui/button";
export const metadata = { title: "Shipping" };
const TABS: { key: string; label: string; statuses?: ShipmentStatus[] }[] = [
  { key: "active", label: "Active", statuses: ["REQUESTED", "BOOKED", "IN_TRANSIT", "HOLD"] },
  { key: "exceptions", label: "Exceptions", statuses: ["FAILED", "HOLD", "CANCELLED", "RETURNED"] },
  { key: "delivered", label: "Delivered", statuses: ["DELIVERED", "PARTIAL_DELIVERED"] },
  { key: "all", label: "All" },
];
export default async function Shipping({ searchParams }: { searchParams: Promise<{ tab?: string; provider?: string }> }) {
  const staff = await requireStaffPage("orders.read");
  const sp = await searchParams;
  const tab = TABS.find((t) => t.key === sp.tab) ?? TABS[0];
  const where = { ...(tab.statuses ? { status: { in: tab.statuses } } : {}), ...(sp.provider ? { providerCode: sp.provider } : {}) };
  const [shipments, ready, providers, codTotals] = await Promise.all([
    db.shipment.findMany({ where, orderBy: { createdAt: "desc" }, take: 100, include: { order: { select: { number: true, id: true, customerName: true, address: { select: { district: true } } } } } }),
    db.order.findMany({ where: { status: { in: ["CONFIRMED", "PROCESSING"] }, shipments: { none: { status: { in: ["REQUESTED", "BOOKED", "IN_TRANSIT", "DELIVERED"] } } } }, orderBy: { placedAt: "asc" }, take: 20, select: { id: true, number: true, customerName: true, totalMinor: true, placedAt: true } }),
    db.shippingProvider.findMany(),
    db.shipment.groupBy({ by: ["providerCode", "status"], _sum: { codAmountMinor: true }, _count: true }),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title="Shipping" description="All courier shipments across Steadfast and Pathao" actions={<>{staff.permissions.has("shipping.write") && <SyncShipments />}<Button asChild size="sm" variant="outline"><Link href="/admin/settings/shipping"><Settings2 className="h-4 w-4" /> Couriers</Link></Button></>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {providers.map((p) => {
          const rows = codTotals.filter((c) => c.providerCode === p.code);
          const inTransit = rows.filter((r) => ["BOOKED", "IN_TRANSIT", "HOLD"].includes(r.status)).reduce((s, r) => s + (r._sum.codAmountMinor ?? 0), 0);
          const delivered = rows.filter((r) => r.status === "DELIVERED").reduce((s, r) => s + (r._sum.codAmountMinor ?? 0), 0);
          return (
            <div key={p.code} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-center justify-between"><p className="font-semibold">{p.name}</p><StatusBadge status={p.isEnabled ? p.mode : "DRAFT"} label={p.isEnabled ? p.mode.toLowerCase() : "disabled"} /></div>
              <p className="mt-3 text-[12px] text-muted-foreground">COD in transit</p><p className="font-semibold tabular">{formatMoney(inTransit)}</p>
              <p className="mt-2 text-[12px] text-muted-foreground">COD delivered</p><p className="font-semibold tabular">{formatMoney(delivered)}</p>
            </div>
          );
        })}
        <div className="rounded-xl border border-border bg-surface p-4 sm:col-span-2">
          <p className="font-semibold">Ready to book ({ready.length})</p>
          <p className="mb-2 text-[12px] text-muted-foreground">Confirmed orders without an active shipment</p>
          <ul className="max-h-36 space-y-1 overflow-y-auto text-sm">{ready.map((o) => <li key={o.id} className="flex justify-between"><Link href={`/admin/orders/${o.id}`} className="font-mono hover:underline">{o.number}</Link><span className="text-muted-foreground">{o.customerName} · {formatMoney(o.totalMinor)}</span></li>)}</ul>
        </div>
      </div>
      <div>
        <FilterTabs active={tab.key} items={TABS.map((t) => ({ key: t.key, label: t.label, href: `/admin/shipping?tab=${t.key}` }))} />
        {shipments.length === 0 ? <EmptyState title="No shipments" /> : (
          <Table>
            <thead><tr><th>Order</th><th>Courier</th><th>Consignment / tracking</th><th>Status</th><th>Courier status</th><th className="text-right">COD</th><th>Created</th><th>Last sync</th></tr></thead>
            <tbody>{shipments.map((s) => (
              <tr key={s.id}>
                <td><Link href={`/admin/orders/${s.order.id}`} className="font-mono font-semibold hover:underline">{s.order.number}</Link><p className="text-[12px] text-muted-foreground">{s.order.customerName} · {s.order.address?.district}</p></td>
                <td className="capitalize">{s.providerCode}{s.mode === "MOCK" && <span className="ml-1 text-[11px] text-amber-600">mock</span>}</td>
                <td className="font-mono text-[12px]">{s.consignmentId ?? "—"}<br /><span className="text-muted-foreground">{s.trackingCode}</span></td>
                <td><StatusBadge status={s.status} />{s.lastError && <p className="mt-1 max-w-56 truncate text-[11px] text-red-600" title={s.lastError}>{s.lastError}</p>}</td>
                <td className="text-[12px]">{s.providerStatus ?? "—"}</td>
                <td className="text-right tabular">{formatMoney(s.codAmountMinor)}</td>
                <td className="whitespace-nowrap text-[12px] text-muted-foreground">{formatDateTime(s.createdAt)}</td>
                <td className="whitespace-nowrap text-[12px] text-muted-foreground">{s.lastSyncedAt ? formatDateTime(s.lastSyncedAt) : "—"}</td>
              </tr>
            ))}</tbody>
          </Table>
        )}
        <p className="mt-3 text-[12px] text-muted-foreground">Failed bookings can be retried from the order page with “Create shipment”; each attempt is recorded and an order can only have one active shipment.</p>
      </div>
    </div>
  );
}
