import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/auth/guards";
import { formatMoney } from "@/lib/money";
import { formatDate, formatDateTime } from "@/lib/utils";
import { EmptyState, FilterTabs, PageHeader, Pagination, StatusBadge, Table } from "@/components/admin/ui";
import { InquiryStatus, ProcessDeletion } from "@/components/admin/sales-forms";
import { Button } from "@/components/ui/button";
export const metadata = { title: "Customers" };
const PER = 30;

export default async function Customers({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string; page?: string }> }) {
  const staff = await requireStaffPage("customers.read");
  const sp = await searchParams;
  const tab = sp.tab ?? "accounts";
  const page = Math.max(1, Number(sp.page) || 1);
  const [openInquiries, pendingDeletions] = await Promise.all([db.supportInquiry.count({ where: { status: "open" } }), db.dataDeletionRequest.count({ where: { status: "pending" } })]);
  const tabs = [
    { key: "accounts", label: "Accounts", href: "/admin/customers" },
    { key: "buyers", label: "All buyers (incl. guests)", href: "/admin/customers?tab=buyers" },
    { key: "inquiries", label: "Support inquiries", href: "/admin/customers?tab=inquiries", count: openInquiries },
    { key: "privacy", label: "Deletion requests", href: "/admin/customers?tab=privacy", count: pendingDeletions },
    { key: "newsletter", label: "Newsletter", href: "/admin/customers?tab=newsletter" },
  ];
  let body: React.ReactNode = null;
  if (tab === "accounts") {
    const where = { kind: "CUSTOMER" as const, ...(sp.q ? { OR: [{ name: { contains: sp.q, mode: "insensitive" as const } }, { email: { contains: sp.q, mode: "insensitive" as const } }, { phone: { contains: sp.q } }] } : {}) };
    const [users, total] = await Promise.all([db.user.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER, include: { orders: { select: { totalMinor: true, status: true } } } }), db.user.count({ where })]);
    body = (
      <>
        <form className="mb-4 flex gap-2"><input name="q" defaultValue={sp.q} placeholder="Name, email or phone" className="h-9 w-64 rounded-lg border border-border bg-surface px-3 text-sm" /><Button size="sm" variant="secondary">Search</Button></form>
        <Table><thead><tr><th>Customer</th><th>Phone</th><th>Joined</th><th className="text-right">Orders</th><th className="text-right">Lifetime value</th><th>Status</th></tr></thead>
          <tbody>{users.map((u) => { const valid = u.orders.filter((o) => o.status !== "CANCELLED"); return (
            <tr key={u.id}><td><Link href={`/admin/customers/${u.id}`} className="font-medium hover:underline">{u.name}</Link><p className="text-[12px] text-muted-foreground">{u.email}</p></td><td>{u.phone ?? "—"}</td><td className="text-muted-foreground">{formatDate(u.createdAt)}</td><td className="text-right tabular">{u.orders.length}</td><td className="text-right tabular">{formatMoney(valid.reduce((s, o) => s + o.totalMinor, 0))}</td><td><StatusBadge status={u.isActive ? "ACTIVE" : "ARCHIVED"} label={u.isActive ? "active" : "disabled"} /></td></tr>
          ); })}</tbody></Table>
        <Pagination page={page} pages={Math.ceil(total / PER)} href={(p) => `/admin/customers?page=${p}${sp.q ? `&q=${sp.q}` : ""}`} />
      </>
    );
  } else if (tab === "buyers") {
    const rows = await db.$queryRaw<{ phone: string; name: string; orders: bigint; total: bigint; last: Date; has_account: boolean }[]>`
      SELECT phone, MAX("customerName") AS name, COUNT(*) AS orders, SUM("totalMinor") FILTER (WHERE status::text <> 'CANCELLED') AS total, MAX("placedAt") AS last, BOOL_OR("userId" IS NOT NULL) AS has_account
      FROM "Order" GROUP BY phone ORDER BY last DESC LIMIT 200`;
    body = (
      <Table><thead><tr><th>Name</th><th>Phone</th><th className="text-right">Orders</th><th className="text-right">Spent</th><th>Last order</th><th>Type</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.phone}><td className="font-medium">{r.name}</td><td><Link className="hover:underline" href={`/admin/orders?q=${r.phone}`}>{r.phone}</Link></td><td className="text-right tabular">{Number(r.orders)}</td><td className="text-right tabular">{formatMoney(Number(r.total ?? 0))}</td><td className="text-muted-foreground">{formatDate(r.last)}</td><td className="text-[12px]">{r.has_account ? "Account" : "Guest"}{Number(r.orders) > 1 ? " · returning" : ""}</td></tr>)}</tbody></Table>
    );
  } else if (tab === "inquiries") {
    const items = await db.supportInquiry.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 100 });
    body = items.length === 0 ? <EmptyState title="No inquiries" /> : (
      <ul className="space-y-3">{items.map((i) => (
        <li key={i.id} className="rounded-xl border border-border bg-surface p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-medium">{i.subject} <StatusBadge status={i.status === "open" ? "PENDING" : "DELIVERED"} label={i.status} /></p><p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{i.message}</p><p className="mt-2 text-[12px] text-muted-foreground">{i.name} · <a className="underline" href={`mailto:${i.email}`}>{i.email}</a>{i.phone ? ` · ${i.phone}` : ""}{i.orderNumber ? ` · order ${i.orderNumber}` : ""} · {formatDateTime(i.createdAt)}</p></div><InquiryStatus id={i.id} status={i.status} /></div></li>
      ))}</ul>
    );
  } else if (tab === "privacy") {
    const items = await db.dataDeletionRequest.findMany({ include: { user: { select: { name: true, email: true } } }, orderBy: { createdAt: "desc" }, take: 100 });
    body = items.length === 0 ? <EmptyState title="No deletion requests" /> : (
      <Table><thead><tr><th>Customer</th><th>Scope</th><th>Requested</th><th>Status</th><th /></tr></thead>
        <tbody>{items.map((r) => <tr key={r.id}><td>{r.user.name}<p className="text-[12px] text-muted-foreground">{r.user.email}</p></td><td>{r.scope === "account" ? "Account & personal data" : "Try-on images"}</td><td className="text-muted-foreground">{formatDateTime(r.createdAt)}</td><td><StatusBadge status={r.status === "pending" ? "PENDING" : "DELIVERED"} label={r.status} /></td><td className="text-right">{r.status === "pending" && r.scope === "account" && staff.permissions.has("staff.manage") && <ProcessDeletion id={r.id} />}</td></tr>)}</tbody></Table>
    );
  } else {
    const subs = await db.newsletterSubscriber.findMany({ where: { unsubscribedAt: null }, orderBy: { consentAt: "desc" }, take: 500 });
    body = (
      <>
        <div className="mb-3"><Button asChild size="sm" variant="outline"><a href="/api/admin/newsletter/export">Export CSV</a></Button></div>
        <Table><thead><tr><th>Email</th><th>Language</th><th>Source</th><th>Consented</th></tr></thead><tbody>{subs.map((s) => <tr key={s.id}><td>{s.email}</td><td>{s.locale}</td><td>{s.source ?? "—"}</td><td className="text-muted-foreground">{formatDateTime(s.consentAt)}</td></tr>)}</tbody></Table>
      </>
    );
  }
  return (<div><PageHeader title="Customers" /><FilterTabs active={tab} items={tabs} />{body}</div>);
}
