import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/auth/guards";
import { formatMoney } from "@/lib/money";
import { Card, PageHeader, StatusBadge } from "@/components/admin/ui";
export default async function Search({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const staff = await requireStaffPage();
  const q = (await searchParams).q?.trim() ?? "";
  const can = (p: Parameters<typeof staff.permissions.has>[0]) => staff.permissions.has(p);
  const [orders, products, customers] = q ? await Promise.all([
    can("orders.read") ? db.order.findMany({ where: { OR: [{ number: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }, { customerName: { contains: q, mode: "insensitive" } }] }, take: 8, orderBy: { placedAt: "desc" } }) : [],
    can("products.read") ? db.product.findMany({ where: { OR: [{ name: { contains: q, mode: "insensitive" } }, { variants: { some: { sku: { contains: q, mode: "insensitive" } } } }] }, take: 8 }) : [],
    can("customers.read") ? db.user.findMany({ where: { kind: "CUSTOMER", OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] }, take: 8 }) : [],
  ]) : [[], [], []];
  return (
    <div>
      <PageHeader title={`Search: “${q}”`} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title={`Orders (${orders.length})`}><ul className="space-y-2 text-sm">{orders.map((o) => <li key={o.id} className="flex justify-between gap-2"><Link className="font-mono hover:underline" href={`/admin/orders/${o.id}`}>{o.number}</Link><span className="text-muted-foreground">{o.customerName} · {formatMoney(o.totalMinor)}</span><StatusBadge status={o.status} /></li>)}</ul></Card>
        <Card title={`Products (${products.length})`}><ul className="space-y-2 text-sm">{products.map((p) => <li key={p.id}><Link className="hover:underline" href={`/admin/products/${p.id}`}>{p.name}</Link></li>)}</ul></Card>
        <Card title={`Customers (${customers.length})`}><ul className="space-y-2 text-sm">{customers.map((u) => <li key={u.id}><Link className="hover:underline" href={`/admin/customers/${u.id}`}>{u.name}</Link> <span className="text-muted-foreground">{u.email}</span></li>)}</ul></Card>
      </div>
    </div>
  );
}
