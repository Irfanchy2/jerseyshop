import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/auth/guards";
import { formatDateTime } from "@/lib/utils";
import { PageHeader, Pagination, Table } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
export const metadata = { title: "Audit logs" };
const PER = 50;
export default async function AuditLogs({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireStaffPage("audit.read");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where = sp.q ? { OR: [{ action: { contains: sp.q } }, { entityType: { contains: sp.q } }, { entityId: sp.q }, { summary: { contains: sp.q, mode: "insensitive" as const } }] } : {};
  const [logs, total] = await Promise.all([db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER, include: { actor: { select: { name: true, email: true } } } }), db.auditLog.count({ where })]);
  return (
    <div>
      <PageHeader title="Audit logs" description="Sensitive admin operations. Secrets are never recorded." />
      <form className="mb-4 flex gap-2"><input name="q" defaultValue={sp.q} placeholder="Action, entity or id" className="h-9 w-64 rounded-lg border border-border bg-surface px-3 text-sm" /><Button size="sm" variant="secondary">Filter</Button></form>
      <Table>
        <thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Entity</th><th>Summary</th></tr></thead>
        <tbody>{logs.map((l) => (
          <tr key={l.id}><td className="whitespace-nowrap text-muted-foreground">{formatDateTime(l.createdAt)}</td><td>{l.actor?.name ?? "system"}<p className="text-[11px] text-muted-foreground">{l.actor?.email}</p></td><td className="font-mono text-[12px]">{l.action}</td><td className="text-[12px]">{l.entityType}{l.entityId ? <span className="block font-mono text-muted-foreground">{l.entityId.slice(0, 14)}</span> : null}</td><td className="max-w-md text-[12px]"><span className="line-clamp-2" title={l.diff ? JSON.stringify(l.diff) : undefined}>{l.summary ?? (l.diff ? JSON.stringify(l.diff).slice(0, 140) : "")}</span></td></tr>
        ))}</tbody>
      </Table>
      <Pagination page={page} pages={Math.ceil(total / PER)} href={(p) => `/admin/audit-logs?page=${p}${sp.q ? `&q=${sp.q}` : ""}`} />
    </div>
  );
}
