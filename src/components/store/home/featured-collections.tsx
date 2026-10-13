"use client";

import { imgSrc } from "@/lib/images";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { ProductCard as Card } from "@/lib/catalog/queries";
import { useStore } from "../store-provider";
import { SectionHeading } from "../section-heading";
import { ProductCard } from "../product-card";
import { EASE, Stagger, staggerItem } from "../motion";

type Col = { slug: string; name: string; nameBn: string | null; description: string | null; accentHex: string | null; imageUrl: string | null; images: string[]; count: number };

const FAN = [
  { rotate: -9, rest: "-46%", z: 1 },
  { rotate: 7, rest: "44%", z: 2 },
  { rotate: 0, rest: "0%", z: 3 },
];

export function FeaturedCollections({ eyebrow, title, collections, products }: { eyebrow?: string; title: string; collections: Col[]; products: Card[] }) {
  const { locale } = useStore();
  const L = (en: string, bn: string | null) => (locale === "bn" && bn ? bn : en);
  const [main, ...rest] = collections;
  if (!main) return null;
  const name = L(main.name, main.nameBn).trim().split(/\s+/);
  return (
    <section className="section-y">
      <div className="container-x">
        <SectionHeading eyebrow={eyebrow} title={title} align="center" />
        <Stagger className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-5 lg:grid-cols-[1.9fr_1fr_1fr]" gap={0.1}>
          <motion.div variants={staggerItem} className="col-span-2 lg:col-span-1">
            <Link href={`/collections/${main.slug}`} className="group relative block h-[380px] overflow-hidden rounded-[1.75rem] bg-surface md:h-full md:min-h-[440px]">
              {main.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={main.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1200ms] ease-[var(--ease-out-expo)] group-hover:scale-[1.04]" loading="lazy" />
              ) : (
                <div className="absolute bottom-[-6%] right-[4%] h-[86%] w-[58%] md:right-[8%]">
                  {main.images.slice(0, 3).map((src, i) => (
                    <motion.div
                      key={src}
                      className="absolute bottom-0 left-[19%] w-[62%]"
                      style={{ zIndex: FAN[i].z }}
                      initial={{ rotate: 0, x: "0%" }}
                      whileInView={{ rotate: FAN[i].rotate, x: FAN[i].rest }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.2, delay: 0.2, ease: EASE }}
                    >
                      <div className={`transition-transform duration-700 ease-[var(--ease-out-expo)] ${i === 0 ? "group-hover:-translate-x-[18%] group-hover:-rotate-6" : i === 1 ? "group-hover:translate-x-[18%] group-hover:rotate-6" : "group-hover:-translate-y-[6%]"}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imgSrc(src, 480, { transparent: true })} alt="" loading="lazy" decoding="async" className="w-full drop-shadow-[0_24px_28px_rgba(0,0,0,.18)]" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-surface via-surface/70 to-transparent md:via-surface/30" aria-hidden />
              <div className="relative flex h-full flex-col justify-between p-7 md:p-10">
                <div>
                  <p className="text-[11.5px] font-medium uppercase tracking-[0.36em] text-accent-ink">{main.count} {locale === "bn" ? "পণ্য" : "pieces"}</p>
                  <h3 className="mt-4 font-heading text-[38px] leading-[1.02] tracking-[-0.04em] md:text-[52px]">
                    <span className="block font-light">{name.length > 1 ? name.slice(0, -1).join(" ") : ""}</span>
                    <span className="block font-bold">{name[name.length - 1]}</span>
                  </h3>
                  {main.description && <p className="mt-4 max-w-[17rem] text-[14.5px] leading-relaxed text-muted-foreground">{main.description}</p>}
                </div>
                <span className="inline-flex items-center gap-2 text-[15px] font-medium">
                  {locale === "bn" ? "কালেকশন দেখুন" : "Shop the edit"}
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          </motion.div>
          {products.slice(0, 2).map((p, i) => (
            <ProductCard key={p.id} p={p} index={i} compact />
          ))}
        </Stagger>
        {rest.length > 0 && (
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {rest.map((c) => (
              <Link key={c.slug} href={`/collections/${c.slug}`} className="rounded-full bg-surface px-4 py-2 text-[14px] transition-colors hover:bg-accent hover:text-accent-foreground">
                {L(c.name, c.nameBn)}
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
