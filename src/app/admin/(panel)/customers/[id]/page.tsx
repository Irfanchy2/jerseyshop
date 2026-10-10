import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/auth/guards";
import { formatMoney } from "@/lib/money";
import { formatDate, formatDateTime } from "@/lib/utils";
import { Card, PageHeader, StatusBadge, Table } from "@/components/admin/ui";
export default async function CustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireStaffPage("customers.read");
  const u = await db.user.findUnique({ where: { id: (await params).id }, include: { orders: { orderBy: { placedAt: "desc" } }, addresses: true, profile: true, wishlist: { include: { product: true } }, _count: { select: { tryOnJobs: true, reviews: true, designs: true } } } });
  if (!u || u.kind !== "CUSTOMER") notFound();
  const ltv = u.orders.filter((o) => o.status !== "CANCELLED").reduce((s, o) => s + o.totalMinor, 0);
  return (
    <div>
      <PageHeader back={{ href: "/admin/customers", label: "Customers" }} title={u.name} description={`${u.email}${u.phone ? ` · ${u.phone}` : ""} · joined ${formatDate(u.createdAt)}`} />
      <div className="mb-4 grid gap-4 sm:grid-cols-4">
        {[["Orders", u.orders.length], ["Lifetime value", formatMoney(ltv)], ["Reviews", u._count.reviews], ["Marketing consent", u.profile?.marketingConsent ? "Yes" : "No"]].map(([l, v]) => <div key={l as string} className="rounded-xl border border-border bg-surface p-4"><p className="text-[12px] text-muted-foreground">{l}</p><p className="mt-1 text-lg font-semibold">{v}</p></div>)}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Card title="Orders" className="xl:col-span-2" bodyClassName="p-0">
          <Table className="rounded-none border-0"><thead><tr><th>Order</th><th>Date</th><th>Status</th><th className="text-right">Total</th></tr></thead><tbody>{u.orders.map((o) => <tr key={o.id}><td><Link href={`/admin/orders/${o.id}`} className="font-mono hover:underline">{o.number}</Link></td><td className="text-muted-foreground">{formatDateTime(o.placedAt)}</td><td><StatusBadge status={o.status} /></td><td className="text-right tabular">{formatMoney(o.totalMinor)}</td></tr>)}</tbody></Table>
        </Card>
        <div className="space-y-4">
          <Card title="Addresses">{u.addresses.length ? <ul className="space-y-3 text-sm">{u.addresses.map((a) => <li key={a.id}>{a.label}: {a.line1}, {a.area}, {a.district}</li>)}</ul> : <p className="text-sm text-muted-foreground">None saved.</p>}</Card>
          <Card title="Wishlist">{u.wishlist.length ? <ul className="space-y-1 text-sm">{u.wishlist.map((w) => <li key={w.productId}>{w.product.name}</li>)}</ul> : <p className="text-sm text-muted-foreground">Empty.</p>}</Card>
          <Card title="Activity"><p className="text-sm text-muted-foreground">{u._count.designs} saved designs · {u._count.tryOnJobs} try-on jobs · last sign-in {u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "never"}</p></Card>
        </div>
      </div>
    </div>
  );
}
