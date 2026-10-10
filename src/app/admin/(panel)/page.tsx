import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, AlertTriangle, ShoppingCart, Clock, CheckCircle2, XCircle, Wallet, Repeat, TrendingUp, CalendarDays } from "lucide-react";
import { getStaff } from "@/lib/auth/session";
import { dashboardMetrics } from "@/lib/admin/metrics";
import { formatMoney } from "@/lib/money";
import { Card, DemoBanner, EmptyState, PageHeader, Table } from "@/components/admin/ui";
import { AnimatedNumber, BarsChart, TrendChart } from "@/components/admin/charts";
import { cn } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

function Delta({ v }: { v: number | null }) {
  if (v == null || !isFinite(v)) return <span className="text-[12px] text-muted-foreground">no prior data</span>;
  const up = v >= 0;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-[12px] font-medium", up ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
      {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}{Math.abs(v * 100).toFixed(1)}% vs prev.
    </span>
  );
}

function Stat({ label, icon: Icon, children, sub }: { label: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between text-[13px] text-muted-foreground"><span>{label}</span><Icon className="h-4 w-4" /></div>
      <p className="mt-3 font-heading text-[26px] font-bold leading-none tabular">{children}</p>
      <div className="mt-2 min-h-4">{sub}</div>
    </div>
  );
}

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ range?: string; denied?: string }> }) {
  const { range, denied } = await searchParams;
  const days = [7, 30, 90].includes(Number(range)) ? Number(range) : 30;
  const staff = await getStaff();
  if (!staff?.permissions.has("dashboard.view")) {
    return <EmptyState title={`Welcome, ${staff?.name}`} body="Your role doesn't include dashboard access. Use the menu to reach the areas you manage." />;
  }
  const m = await dashboardMetrics(days);
  const returningRate = m.customers ? m.returning / m.customers : 0;

  return (
    <div>
      {denied && <p className="mb-4 rounded-lg bg-red-500/10 px-4 py-2.5 text-sm text-red-700 dark:text-red-300">You don&apos;t have permission to open that page ({denied}).</p>}
      <PageHeader
        title="Dashboard"
        description={`Store performance for the last ${days} days`}
        actions={
          <div className="inline-flex rounded-lg border border-border bg-surface p-0.5 text-[13px]">
            {[7, 30, 90].map((d) => (
              <Link key={d} href={`/admin?range=${d}`} className={cn("rounded-md px-3 py-1.5 font-medium", d === days ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}>{d}d</Link>
            ))}
          </div>
        }
      />
      {m.demo && <DemoBanner />}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Revenue" icon={TrendingUp} sub={<Delta v={m.revenueDelta} />}><AnimatedNumber value={m.revenue} format="money" /></Stat>
        <Stat label="Orders" icon={ShoppingCart} sub={<Delta v={m.ordersDelta} />}><AnimatedNumber value={m.orders} format="int" /></Stat>
        <Stat label="Average order value" icon={Wallet} sub={<span className="text-[12px] text-muted-foreground">excl. cancelled</span>}><AnimatedNumber value={m.aov} format="money" /></Stat>
        <Stat label="Returning customers" icon={Repeat} sub={<span className="text-[12px] text-muted-foreground">{m.returning} of {m.customers} customers</span>}>{(returningRate * 100).toFixed(1)}%</Stat>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Today's orders", v: m.today, icon: CalendarDays, href: "/admin/orders" },
          { label: "Pending", v: m.status.PENDING ?? 0, icon: Clock, href: "/admin/orders?status=PENDING" },
          { label: "Delivered", v: m.status.DELIVERED ?? 0, icon: CheckCircle2, href: "/admin/orders?status=DELIVERED" },
          { label: "Cancelled", v: m.status.CANCELLED ?? 0, icon: XCircle, href: "/admin/orders?status=CANCELLED" },
          { label: "All-time sales", v: m.allTimeSales, icon: TrendingUp, href: "/admin/analytics", money: true },
        ].map((s) => (
          <Link key={s.label} href={s.href} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 transition hover:border-foreground/20">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-muted"><s.icon className="h-4 w-4" /></span>
            <span><span className="block text-[12px] text-muted-foreground">{s.label}</span><span className="block font-semibold tabular">{s.money ? formatMoney(s.v) : s.v.toLocaleString("en-IN")}</span></span>
          </Link>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card title="Revenue trend" description="Daily revenue, excluding cancelled & returned orders" className="xl:col-span-2">
          {m.orders ? <TrendChart data={m.series} dataKey="revenue" money /> : <EmptyState title="No sales in this period yet" body="Revenue will appear here as orders come in." />}
        </Card>
        <Card title="Orders by status" description={`Placed in the last ${days} days`}>
          {m.orders ? (
            <BarsChart layout="vertical" height={260} data={["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"].map((s) => ({ label: s.charAt(0) + s.slice(1).toLowerCase(), value: m.status[s] ?? 0 }))} />
          ) : <EmptyState title="No orders yet" />}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card title="Top-selling jerseys" description="Units sold in period" className="xl:col-span-2" bodyClassName="p-0">
          {m.top.length ? (
            <Table className="rounded-none border-0">
              <thead><tr><th>Product</th><th className="text-right">Units</th><th className="text-right">Revenue</th></tr></thead>
              <tbody>
                {m.top.map((t) => (
                  <tr key={t.productId ?? t.name}>
                    <td>{t.productId ? <Link href={`/admin/products/${t.productId}`} className="font-medium hover:underline">{t.name}</Link> : t.name}</td>
                    <td className="text-right tabular">{t.qty}</td>
                    <td className="text-right tabular">{formatMoney(t.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : <div className="p-5"><EmptyState title="No sales yet" /></div>}
        </Card>
        <Card title="Low stock" description="At or below the variant threshold" actions={<Link href="/admin/inventory?filter=low" className="text-[13px] text-muted-foreground hover:text-foreground">View all</Link>} bodyClassName="p-0">
          {m.lowStock.length ? (
            <ul className="divide-y divide-border">
              {m.lowStock.map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-3 px-5 py-3 text-[13px]">
                  <span className="min-w-0"><Link href={`/admin/products/${v.productId}`} className="block truncate font-medium hover:underline">{v.name}</Link><span className="text-muted-foreground">{v.sku}</span></span>
                  <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", v.stock === 0 ? "bg-red-500/12 text-red-700 dark:text-red-300" : "bg-amber-500/12 text-amber-700 dark:text-amber-300")}>
                    <AlertTriangle className="h-3 w-3" /> {v.stock === 0 ? "Out of stock" : `${v.stock} left`}
                  </span>
                </li>
              ))}
            </ul>
          ) : <div className="p-5 text-sm text-muted-foreground">All variants are above their thresholds.</div>}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card title="Courier performance" description={`Shipments created in the last ${days} days`} className="xl:col-span-2" bodyClassName="p-0">
          {m.couriers.length ? (
            <Table className="rounded-none border-0">
              <thead><tr><th>Courier</th><th className="text-right">Shipments</th><th className="text-right">Delivered</th><th className="text-right">Returned/cancelled</th><th className="text-right">Failed bookings</th><th className="text-right">Avg. time to deliver</th></tr></thead>
              <tbody>
                {m.couriers.map((c) => (
                  <tr key={c.provider}>
                    <td className="font-medium capitalize">{c.provider}</td>
                    <td className="text-right tabular">{c.total}</td>
                    <td className="text-right tabular">{c.delivered} <span className="text-muted-foreground">({c.total ? Math.round((c.delivered / c.total) * 100) : 0}%)</span></td>
                    <td className="text-right tabular">{c.returned}</td>
                    <td className="text-right tabular">{c.failed}</td>
                    <td className="text-right tabular">{c.avgHours != null ? `${(c.avgHours / 24).toFixed(1)} days` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : <div className="p-5"><EmptyState title="No shipments yet" body="Create a shipment from any confirmed order to see courier performance here." /></div>}
        </Card>
        <Card title="Cash on Delivery" description="COD orders placed in period">
          <dl className="space-y-4">
            <div><dt className="text-[13px] text-muted-foreground">Delivered (collected by courier)</dt><dd className="mt-1 text-xl font-bold tabular">{formatMoney(m.cod.collected)} <span className="text-sm font-normal text-muted-foreground">· {m.cod.collectedN} orders</span></dd></div>
            <div><dt className="text-[13px] text-muted-foreground">In transit (to be collected)</dt><dd className="mt-1 text-xl font-bold tabular">{formatMoney(m.cod.outstanding)} <span className="text-sm font-normal text-muted-foreground">· {m.cod.outstandingN} orders</span></dd></div>
            <p className="text-[12px] text-muted-foreground">Courier payouts are reconciled from courier statements; this shows order-level COD amounts.</p>
          </dl>
        </Card>
      </div>

      <div className="mt-4">
        <Card title="Conversion" description="Unique browser sessions from first-party analytics">
          {m.funnel ? (
            <div className="grid gap-3 sm:grid-cols-5">
              {[["Sessions", m.funnel.sessions], ["Viewed a product", m.funnel.product], ["Added to bag", m.funnel.cart], ["Started checkout", m.funnel.checkout], ["Purchased", m.funnel.orders]].map(([l, v], i) => (
                <div key={l as string} className="rounded-lg bg-muted/60 p-4">
                  <p className="text-[12px] text-muted-foreground">{l as string}</p>
                  <p className="mt-1 text-xl font-bold tabular">{(v as number).toLocaleString("en-IN")}</p>
                  {i > 0 && <p className="text-[12px] text-muted-foreground">{m.funnel!.sessions ? (((v as number) / m.funnel!.sessions) * 100).toFixed(1) : 0}% of sessions</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Not enough measured traffic yet. Conversion is shown only when real session data exists.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
