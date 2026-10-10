"use client";

import * as React from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ProductCard as Card } from "@/lib/catalog/queries";
import { ProductCard } from "../product-card";
import { SectionHeading } from "../section-heading";
import { useStore } from "../store-provider";

export function ProductRail({ title, href, items }: { title: string; href?: string; items: Card[] }) {
  const { t } = useStore();
  const [ref, api] = useEmblaCarousel({ align: "start", dragFree: true, containScroll: "trimSnaps" });
  const [can, setCan] = React.useState({ prev: false, next: true });
  React.useEffect(() => {
    if (!api) return;
    const update = () => setCan({ prev: api.canScrollPrev(), next: api.canScrollNext() });
    update();
    api.on("select", update).on("reInit", update).on("scroll", update);
  }, [api]);
  if (!items.length) return null;
  return (
    <section className="section-y">
      <div className="container-x">
        <div className="flex items-end justify-between gap-4">
          <SectionHeading title={title} href={href} linkLabel={t.home.viewAll} className="flex-1" />
          <div className="mb-10 hidden gap-2 md:flex">
            <button onClick={() => api?.scrollPrev()} disabled={!can.prev} className="grid h-10 w-10 place-items-center rounded-full border border-border transition hover:border-foreground disabled:opacity-30" aria-label="Previous">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={() => api?.scrollNext()} disabled={!can.next} className="grid h-10 w-10 place-items-center rounded-full border border-border transition hover:border-foreground disabled:opacity-30" aria-label="Next">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="-mx-1 overflow-hidden" ref={ref}>
          <div className="flex">
            {items.map((p, i) => (
              <div key={p.id} className="min-w-0 shrink-0 basis-[68%] px-1.5 sm:basis-[42%] md:basis-[31%] lg:basis-[24%]">
                <ProductCard p={p} index={i % 4} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
