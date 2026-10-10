import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { Stars } from "../home/reviews";
import { formatDate } from "@/lib/utils";

type R = { id: string; rating: number; title: string | null; body: string; author: string; date: string; verified: boolean };

export function ProductReviews({ title, empty, verified, avg, reviews, productId }: { title: string; empty: string; verified: string; avg: number; reviews: R[]; productId: string }) {
  return (
    <section id="reviews" className="container-x section-y scroll-mt-24">
      <div className="grid gap-10 lg:grid-cols-[320px_1fr]">
        <div>
          <h2 className="font-heading text-[28px] font-bold">{title}</h2>
          {reviews.length > 0 ? (
            <div className="mt-4 flex items-center gap-3">
              <span className="font-heading text-5xl font-extrabold tabular">{avg.toFixed(1)}</span>
              <div>
                <Stars value={Math.round(avg)} className="h-4 w-4" />
                <p className="mt-1 text-sm text-muted-foreground">{reviews.length} review{reviews.length === 1 ? "" : "s"}</p>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-muted-foreground">{empty}</p>
          )}
          <p className="mt-6 text-[13px] text-muted-foreground">
            Only customers who received this jersey can review it.{" "}
            <Link href={`/account/orders?review=${productId}`} className="font-medium text-foreground underline underline-offset-4">Write a review</Link>
          </p>
        </div>
        <div className="divide-y divide-border">
          {reviews.map((r) => (
            <article key={r.id} className="py-6 first:pt-0">
              <div className="flex items-center justify-between gap-4">
                <Stars value={r.rating} />
                <time className="text-[12px] text-muted-foreground" dateTime={r.date}>{formatDate(r.date)}</time>
              </div>
              {r.title && <h3 className="mt-3 font-semibold">{r.title}</h3>}
              <p className="mt-1.5 leading-relaxed text-muted-foreground">{r.body}</p>
              <p className="mt-3 flex items-center gap-1.5 text-[13px] font-medium">
                {r.author} {r.verified && <span className="inline-flex items-center gap-1 text-success"><BadgeCheck className="h-3.5 w-3.5" />{verified}</span>}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
