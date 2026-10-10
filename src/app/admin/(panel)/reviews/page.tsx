import Link from "next/link";
import type { ReviewStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/auth/guards";
import { formatDateTime } from "@/lib/utils";
import { EmptyState, FilterTabs, PageHeader } from "@/components/admin/ui";
import { ReviewActions } from "@/components/admin/sales-forms";
export const metadata = { title: "Reviews" };
export default async function Reviews({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireStaffPage("reviews.write");
  const sp = await searchParams;
  const status = (["PENDING", "APPROVED", "REJECTED"].includes(sp.status ?? "") ? sp.status : "PENDING") as ReviewStatus;
  const [reviews, counts] = await Promise.all([
    db.review.findMany({ where: { status }, include: { user: { select: { name: true, email: true } }, product: { select: { name: true, id: true } }, orderItem: { select: { order: { select: { number: true } } } } }, orderBy: { createdAt: "desc" }, take: 100 }),
    db.review.groupBy({ by: ["status"], _count: true }),
  ]);
  const c = (s: string) => counts.find((x) => x.status === s)?._count ?? 0;
  return (
    <div>
      <PageHeader title="Reviews" description="Only customers with a delivered order can review. Approve before reviews appear publicly." />
      <FilterTabs active={status} items={(["PENDING", "APPROVED", "REJECTED"] as const).map((s) => ({ key: s, label: s.charAt(0) + s.slice(1).toLowerCase(), href: `/admin/reviews?status=${s}`, count: c(s) }))} />
      {reviews.length === 0 ? <EmptyState title="Nothing here" /> : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm"><span className="font-semibold">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span> <span className="ml-2 font-medium">{r.title}</span></p>
                  <p className="mt-1 text-sm text-muted-foreground">{r.body}</p>
                  <p className="mt-2 text-[12px] text-muted-foreground">{r.user.name} ({r.user.email}) · <Link href={`/admin/products/${r.product.id}`} className="underline">{r.product.name}</Link>{r.orderItem ? ` · verified order ${r.orderItem.order.number}` : ""} · {formatDateTime(r.createdAt)}</p>
                </div>
                <ReviewActions id={r.id} status={r.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
