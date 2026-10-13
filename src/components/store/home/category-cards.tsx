"use client";

import { imgSrc } from "@/lib/images";
import Link from "next/link";
import { motion } from "framer-motion";
import type { SectionContent } from "@/lib/cms/sections";
import { useStore } from "../store-provider";
import { SectionHeading } from "../section-heading";
import { Stagger, staggerItem } from "../motion";

export function CategoryCards({ c, images }: { c: SectionContent<"category_cards">; images: Record<string, string | null> }) {
  const { locale, t } = useStore();
  const L = (en: string, bn: string) => (locale === "bn" && bn ? bn : en);
  const cols = c.items.length >= 7 ? "lg:grid-cols-7" : c.items.length === 5 ? "lg:grid-cols-5" : c.items.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-6";
  return (
    <section className="section-y">
      <div className="container-x">
        <SectionHeading eyebrow={L(c.eyebrow, c.eyebrowBn) || undefined} title={L(c.title, c.titleBn)} href="/shop" linkLabel={t.home.viewAll} />
        <Stagger className={`no-scrollbar -mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 md:gap-5 ${cols}`} gap={0.06}>
          {c.items.map((item) => {
            const src = item.imageUrl ?? (item.productSlug ? images[item.productSlug] : null);
            return (
              <motion.div key={item.href + item.label} variants={staggerItem} className="w-[42%] shrink-0 snap-start sm:w-auto">
                <Link href={item.href} className="group flex h-full flex-col items-center rounded-[1.5rem] bg-surface px-3 pb-5 pt-4 transition-colors duration-500 hover:bg-muted md:pb-6">
                  <div className="relative aspect-square w-full">
                    {src && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imgSrc(src, 320, { transparent: true })}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 h-full w-full object-contain p-[6%] transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:-translate-y-1.5 group-hover:scale-[1.07]"
                      />
                    )}
                  </div>
                  <span className="mt-3 text-center text-[13.5px] font-medium transition-colors duration-300 group-hover:text-accent-ink md:text-[15px]">{L(item.label, item.labelBn)}</span>
                </Link>
              </motion.div>
            );
          })}
        </Stagger>
      </div>
    </section>
  );
}
