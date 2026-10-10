import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/auth/guards";
import { dashboardMetrics, rangeStart } from "@/lib/admin/metrics";
import { formatMoney } from "@/lib/money";
import { Card, DemoBanner, EmptyState, PageHeader, Table } from "@/components/admin/ui";
import { BarsChart, TrendChart } from "@/components/admin/charts";
import { cn } from "@/lib/utils";
export const metadata = { title: "Analytics" };
export default async function Analytics({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  await requireStaffPage("dashboard.view");
  const days = [7, 30, 90, 365].includes(Number((await searchParams).range)) ? Number((await searchParams).range) : 30;
  const since = rangeStart(days);
  const [m, byCategory, byDistrict, productViews, tryon, customized] = await Promise.all([
    dashboardMetrics(days),
    db.$queryRaw<{ name: string; revenue: bigint; units: bigint }[]>`SELECT c.name, SUM(i."lineTotalMinor") AS revenue, SUM(i.quantity) AS units FROM "OrderItem" i JOIN "Order" o ON o.id = i."orderId" JOIN "Product" p ON p.id = i."productId" JOIN "Category" c ON c.id = p."categoryId" WHERE o."placedAt" >= ${since} AND o.status::text <> 'CANCELLED' GROUP BY c.name ORDER BY revenue DESC`,
    db.$queryRaw<{ district: string; orders: bigint; revenue: bigint }[]>`SELECT a.district, COUNT(*) AS orders, SUM(o."totalMinor") AS revenue FROM "Order" o JOIN "OrderAddress" a ON a."orderId" = o.id WHERE o."placedAt" >= ${since} AND o.status::text <> 'CANCELLED' GROUP BY a.district ORDER BY orders DESC LIMIT 10`,
    db.$queryRaw<{ product: string; views: bigint }[]>`SELECT p.name AS product, COUNT(*) AS views FROM "AnalyticsEvent" e JOIN "Product" p ON p.id = e."productId" WHERE e.name = 'product_view' AND e."createdAt" >= ${since} GROUP BY p.name ORDER BY views DESC LIMIT 8`,
    db.tryOnJob.groupBy({ by: ["status"], where: { createdAt: { gte: since } }, _count: true }),
    db.$queryRaw<{ units: bigint | null; fees: bigint | null }[]>`SELECT SUM(i.quantity) AS units, SUM(i."customizationMinor" * i.quantity) AS fees FROM "OrderItem" i JOIN "Order" o ON o.id = i."orderId" WHERE i."customDesignId" IS NOT NULL AND o."placedAt" >= ${since} AND o.status::text <> 'CANCELLED'`,
  ]);
  return (
    <div className="space-y-4">
      <PageHeader title="Analytics" description="Sales, products, regions and feature usage — all from recorded data" actions={<div className="inline-flex rounded-lg border border-border bg-surface p-0.5 text-[13px]">{[7, 30, 90, 365].map((d) => <Link key={d} href={`/admin/analytics?range=${d}`} className={cn("rounded-md px-3 py-1.5 font-medium", d === days ? "bg-foreground text-background" : "text-muted-foreground")}>{d === 365 ? "1y" : `${d}d`}</Link>)}</div>} />
      {m.demo && <DemoBanner />}
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Revenue">{m.orders ? <TrendChart data={m.series} dataKey="revenue" money /> : <EmptyState title="No sales yet" />}</Card>
        <Card title="Orders per day">{m.orders ? <TrendChart data={m.series} dataKey="orders" /> : <EmptyState title="No orders yet" />}</Card>
        <Card title="Revenue by category">{byCategory.length ? <BarsChart layout="vertical" money data={byCategory.map((c) => ({ label: c.name, value: Number(c.revenue) }))} /> : <EmptyState title="No data" />}</Card>
        <Card title="Top districts" bodyClassName="p-0">{byDistrict.length ? <Table className="rounded-none border-0"><thead><tr><th>District</th><th className="text-right">Orders</th><th className="text-right">Revenue</th></tr></thead><tbody>{byDistrict.map((d) => <tr key={d.district}><td>{d.district}</td><td className="text-right tabular">{Number(d.orders)}</td><td className="text-right tabular">{formatMoney(Number(d.revenue))}</td></tr>)}</tbody></Table> : <div className="p-5"><EmptyState title="No data" /></div>}</Card>
        <Card title="Most viewed products">{productViews.length ? <BarsChart layout="vertical" data={productViews.map((p) => ({ label: p.product.length > 22 ? p.product.slice(0, 21) + "…" : p.product, value: Number(p.views) }))} /> : <p className="text-sm text-muted-foreground">No product views recorded yet.</p>}</Card>
        <Card title="Feature usage">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div><dt className="text-muted-foreground">Try-on jobs</dt><dd className="text-xl font-semibold tabular">{tryon.reduce((a, b) => a + b._count, 0)}</dd><dd className="text-[12px] text-muted-foreground">{tryon.find((t) => t.status === "SUCCEEDED")?._count ?? 0} succeeded · {tryon.find((t) => t.status === "FAILED")?._count ?? 0} failed</dd></div>
            <div><dt className="text-muted-foreground">Personalised jerseys sold</dt><dd className="text-xl font-semibold tabular">{Number(customized[0]?.units ?? 0)}</dd><dd className="text-[12px] text-muted-foreground">{formatMoney(Number(customized[0]?.fees ?? 0))} in personalisation fees</dd></div>
          </dl>
        </Card>
      </div>
    </div>
  );
}
