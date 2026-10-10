"use client";
import { imgSrc, imgSrcSet } from "@/lib/images";
import Link from "next/link";
import { Reveal } from "../reveal";
import { ArrowUpRight } from "lucide-react";
import type { SectionContent } from "@/lib/cms/sections";
import { useStore } from "../store-provider";
import { SectionHeading } from "../section-heading";

export function CategoryCards({ c, images }: { c: SectionContent<"category_cards">; images: Record<string, string | null> }) {
  const { locale } = useStore();
  return (
    <section className="section-y">
      <div className="container-x">
        <SectionHeading title={locale === "bn" && c.titleBn ? c.titleBn : c.title} />
        <div className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">
          {c.items.map((it, i) => {
            const img = it.imageUrl ?? (it.productSlug ? images[it.productSlug] : null);
            return (
              <Reveal key={i} index={i}>
                <Link href={it.href} className="group relative block aspect-[3/4] overflow-hidden rounded-[var(--radius)]" style={{ background: it.bgColor }}>
                  {img && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.imageUrl ? img : imgSrc(img, 640, { transparent: true })} srcSet={it.imageUrl ? undefined : imgSrcSet(img, { transparent: true })} sizes="(min-width: 1024px) 22vw, 45vw" alt="" loading="lazy" className="absolute inset-x-[8%] top-[6%] w-[84%] transition-transform duration-[1.2s] ease-[var(--ease-out-expo)] group-hover:-translate-y-2 group-hover:scale-[1.03]" />
                  )}
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-4 text-black md:p-5">
                    <span className="font-heading text-lg font-bold leading-tight md:text-2xl">{locale === "bn" && it.labelBn ? it.labelBn : it.label}</span>
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-white transition group-hover:bg-black group-hover:text-white">
                      <ArrowUpRight className="h-4 w-4" />
                    </span>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
