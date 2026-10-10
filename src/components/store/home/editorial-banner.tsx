"use client";
import Link from "next/link";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import type { SectionContent } from "@/lib/cms/sections";
import { useStore } from "../store-provider";

export function EditorialBanner({ c, productImage }: { c: SectionContent<"editorial_banner">; productImage: string | null }) {
  const { locale } = useStore();
  const L = (en: string, bn: string) => (locale === "bn" && bn ? bn : en);
  const img = c.imageUrl ?? (productImage ? `${productImage}?bg=none` : null);
  return (
    <section className="section-y">
      <div className="container-x">
        <div className="grid items-center overflow-hidden rounded-[calc(var(--radius)*1.4)] md:grid-cols-2" style={{ background: c.bgColor }}>
          <div className="p-8 md:p-14">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-60">{L(c.eyebrow, c.eyebrowBn)}</p>
            <h2 className="mt-3 font-heading text-[32px] font-extrabold leading-[1.05] md:text-[48px]">{L(c.headline, c.headlineBn)}</h2>
            <p className="mt-4 max-w-md opacity-70">{L(c.body, c.bodyBn)}</p>
            <Button asChild size="lg" className="mt-8"><Link href={c.ctaHref}>{L(c.ctaLabel, c.ctaLabelBn)}</Link></Button>
          </div>
          {img && (
            <motion.div initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }} className="flex justify-center p-8">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt="" loading="lazy" className="max-h-[460px] w-auto drop-shadow-2xl" />
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}
