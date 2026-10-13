"use client";

import * as React from "react";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import type { ProductCard as Card } from "@/lib/catalog/queries";
import { ProductCard, ProductGrid } from "../product-card";
import { SectionHeading } from "../section-heading";
import { FadeUp } from "../motion";
import { useStore } from "../store-provider";

type Props = {
  title: string;
  items: Card[];
  eyebrow?: string;
  sub?: string;
  href?: string;
  align?: "left" | "center";
  columns?: 3 | 4;
  ctaLabel?: string;
  layout?: "grid" | "carousel";
};

export function ProductRail({ title, items, eyebrow, sub, href, align = "left", columns = 4, ctaLabel, layout = "grid" }: Props) {
  const { t } = useStore();
  if (!items.length) return null;
  return (
    <section className="section-y">
      <div className="container-x">
        {layout === "carousel" ? (
          <Carousel title={title} eyebrow={eyebrow} items={items} />
        ) : (
          <>
            <SectionHeading eyebrow={eyebrow} title={title} sub={sub} href={href} linkLabel={t.home.viewAll} align={align} />
            <ProductGrid items={items} columns={columns} />
            {align === "center" && href && (
              <FadeUp className="mt-10 flex justify-center md:mt-14">
                <Link href={href} className="group inline-flex h-12 items-center gap-2.5 rounded-full bg-surface px-7 text-[15px] font-medium transition-colors duration-300 hover:bg-foreground hover:text-background md:h-14 md:px-8 md:text-[16px]">
                  {ctaLabel || t.home.viewAll}
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </FadeUp>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function Carousel({ title, eyebrow, items }: { title: string; eyebrow?: string; items: Card[] }) {
  const [ref, api] = useEmblaCarousel({ align: "start", dragFree: true, containScroll: "trimSnaps" });
  const [can, setCan] = React.useState({ prev: false, next: true });
  React.useEffect(() => {
    if (!api) return;
    const update = () => setCan({ prev: api.canScrollPrev(), next: api.canScrollNext() });
    update();
    api.on("select", update).on("reInit", update).on("scroll", update);
  }, [api]);
  return (
    <>
      <div className="flex items-end justify-between gap-4">
        <SectionHeading eyebrow={eyebrow} title={title} className="flex-1" />
        <div className="mb-12 hidden gap-2 md:flex">
          <button onClick={() => api?.scrollPrev()} disabled={!can.prev} className="grid h-11 w-11 place-items-center rounded-full bg-surface transition hover:bg-foreground hover:text-background disabled:opacity-30" aria-label="Previous">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => api?.scrollNext()} disabled={!can.next} className="grid h-11 w-11 place-items-center rounded-full bg-surface transition hover:bg-foreground hover:text-background disabled:opacity-30" aria-label="Next">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="-mx-1.5 overflow-hidden" ref={ref}>
        <div className="flex">
          {items.map((p, i) => (
            <div key={p.id} className="min-w-0 shrink-0 basis-[68%] px-1.5 sm:basis-[42%] md:basis-[31%] lg:basis-[24%] lg:px-2.5">
              <ProductCard p={p} index={i % 4} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
