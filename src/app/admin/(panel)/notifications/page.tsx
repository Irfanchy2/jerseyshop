import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/auth/guards";
import { formatDateTime } from "@/lib/utils";
import { EmptyState, PageHeader } from "@/components/admin/ui";
import { MarkAllRead } from "@/components/admin/sales-forms";
export const metadata = { title: "Notifications" };
export default async function Notifications() {
  const staff = await requireStaffPage();
  const items = await db.notification.findMany({ where: { OR: [{ userId: null }, { userId: staff.id }] }, orderBy: { createdAt: "desc" }, take: 200 });
  return (
    <div>
      <PageHeader title="Notifications" description="New orders, courier failures, reviews, support and privacy requests" actions={<MarkAllRead />} />
      {items.length === 0 ? <EmptyState title="No notifications" /> : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {items.map((n) => (
            <li key={n.id}><Link href={n.link ?? "#"} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.readAt ? "bg-transparent" : "bg-brand"}`} />
              <span className="min-w-0 flex-1"><span className="block text-sm font-medium">{n.title}</span>{n.body && <span className="block text-[13px] text-muted-foreground">{n.body}</span>}</span>
              <span className="shrink-0 text-[12px] text-muted-foreground">{formatDateTime(n.createdAt)}</span>
            </Link></li>
          ))}
        </ul>
      )}
    </div>
  );
}
