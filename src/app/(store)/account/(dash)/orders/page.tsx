import { imgSrc, imgSrcSet } from "@/lib/images";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireCustomer } from "@/lib/auth/guards";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { STATUS_LABEL } from "@/lib/orders/public";
import { ReviewForm } from "@/components/store/account/account-forms";

export const metadata = { title: "My orders", robots: { index: false } };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ review?: string }> }) {
  const user = await requireCustomer("/account/orders");
  const { review } = await searchParams;
  const orders = await db.order.findMany({ where: { userId: user.id }, orderBy: { placedAt: "desc" }, include: { items: true } });
  const reviewed = new Set((await db.review.findMany({ where: { userId: user.id }, select: { productId: true } })).map((r) => r.productId));
  const reviewable = new Map<string, string>();
  for (const o of orders) if (o.status === "DELIVERED") for (const it of o.items) if (it.productId && !reviewed.has(it.productId)) reviewable.set(it.productId, it.productName);
  return (
    <div className="space-y-8">
      <h2 className="font-heading text-xl font-bold">Orders</h2>
      {review && (reviewable.has(review) ? (
        <div className="rounded-[var(--radius)] border border-border bg-surface p-5"><p className="mb-4 font-semibold">Review: {reviewable.get(review)}</p><ReviewForm productId={review} /></div>
      ) : (
        <p className="rounded-lg bg-muted p-4 text-sm">You can review a jersey after your order containing it has been delivered{reviewed.has(review) ? " — and you've already reviewed this one" : ""}.</p>
      ))}
      {orders.length === 0 ? <p className="text-muted-foreground">No orders yet.</p> : (
        <ul className="space-y-4">
          {orders.map((o) => (
            <li key={o.id} className="rounded-[var(--radius)] border border-border bg-surface p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><Link href={`/account/orders/${o.number}`} className="font-mono font-semibold hover:underline">{o.number}</Link><p className="text-[13px] text-muted-foreground">{formatDate(o.placedAt)} · {o.items.reduce((s, i) => s + i.quantity, 0)} items</p></div>
                <div className="text-right"><p className="font-semibold tabular">{formatMoney(o.totalMinor)}</p><p className="text-[13px] text-muted-foreground">{STATUS_LABEL[o.status]}</p></div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {o.items.map((it) => (
                  <div key={it.id} className="flex items-center gap-2 rounded-lg bg-muted/60 p-1.5 pr-3 text-[13px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {it.imageUrl && <img src={imgSrc(it.imageUrl, 320)} alt="" className="h-10 w-8 rounded object-cover" />}
                    <span>{it.productName} · {it.size}</span>
                    {o.status === "DELIVERED" && it.productId && !reviewed.has(it.productId) && <Link href={`/account/orders?review=${it.productId}`} className="ml-1 font-semibold underline">Review</Link>}
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
