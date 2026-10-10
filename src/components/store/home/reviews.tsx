import { imgSrc, imgSrcSet } from "@/lib/images";
import Link from "next/link";
import { Star, BadgeCheck } from "lucide-react";
import { SectionHeading } from "../section-heading";

type R = { id: string; rating: number; title: string | null; body: string; author: string; product: { name: string; slug: string; image: string | null } };

export function Stars({ value, className = "h-3.5 w-3.5" }: { value: number; className?: string }) {
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => <Star key={i} className={`${className} ${i <= value ? "fill-current" : "opacity-25"}`} />)}
    </span>
  );
}

/** Only shows approved reviews from verified purchases. Hidden when there are none. */
export function Reviews({ title, reviews, verifiedLabel }: { title: string; reviews: R[]; verifiedLabel: string }) {
  if (!reviews.length) return null;
  return (
    <section className="section-y">
      <div className="container-x">
        <SectionHeading title={title} />
        <div className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-3 md:px-0">
          {reviews.map((r) => (
            <figure key={r.id} className="flex min-w-[85%] snap-start flex-col rounded-[var(--radius)] border border-border bg-surface p-6 sm:min-w-[60%] md:min-w-0">
              <Stars value={r.rating} />
              {r.title && <p className="mt-4 font-heading text-lg font-semibold">{r.title}</p>}
              <blockquote className="mt-2 flex-1 text-[15px] leading-relaxed text-muted-foreground">“{r.body}”</blockquote>
              <figcaption className="mt-6 flex items-center gap-3 border-t border-border pt-4">
                <Link href={`/products/${r.product.slug}`} aria-label={r.product.name} className="h-12 w-10 shrink-0 overflow-hidden rounded bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {r.product.image && <img src={imgSrc(r.product.image, 320)} alt="" className="h-full w-full object-cover" loading="lazy" />}
                </Link>
                <div className="min-w-0 text-[13px]">
                  <p className="flex items-center gap-1 font-semibold">{r.author} <BadgeCheck className="h-3.5 w-3.5 text-success" aria-label={verifiedLabel} /></p>
                  <Link href={`/products/${r.product.slug}`} className="block truncate text-muted-foreground hover:underline">{r.product.name}</Link>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
