"use client";

import { imgSrc } from "@/lib/images";
import * as React from "react";
import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import type { SectionContent } from "@/lib/cms/sections";
import { useStore } from "../store-provider";
import { SectionHeading } from "../section-heading";
import { Stagger, staggerItem } from "../motion";

const NUMERALS = ["I", "II", "III"];

function EditCard({ item, image, i }: { item: SectionContent<"edits">["items"][number]; image: string | null; i: number }) {
  const { locale } = useStore();
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLAnchorElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [36, -36]);
  const label = locale === "bn" && item.labelBn ? item.labelBn : item.label;
  const src = item.imageUrl ?? image;
  return (
    <motion.div variants={staggerItem}>
      <Link ref={ref} href={item.href} className="group relative block h-[330px] overflow-hidden rounded-[1.75rem] bg-surface sm:h-[380px] lg:h-[400px] xl:h-[430px]">
        <span className="absolute right-7 top-5 font-serif text-[64px] italic leading-none text-accent/40 transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:-translate-y-1 group-hover:translate-x-1 md:right-9 md:top-7 md:text-[80px]" aria-hidden>
          {NUMERALS[i]}
        </span>
        {src && (
          <motion.div style={{ y }} className="absolute left-1/2 top-[-1%] w-[70%] -translate-x-1/2 sm:w-[64%]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgSrc(src, 640, { transparent: true })}
              alt=""
              loading="lazy"
              decoding="async"
              className="w-full transition-transform duration-[1100ms] ease-[var(--ease-out-expo)] [mask-image:linear-gradient(to_bottom,#000_45%,transparent_78%)] group-hover:-translate-y-2 group-hover:scale-[1.05]"
            />
          </motion.div>
        )}
        <div className="absolute bottom-7 left-7 md:bottom-10 md:left-10">
          <p className="text-[11.5px] font-medium uppercase tracking-[0.42em] text-muted-foreground md:text-[13px]">
            {locale === "bn" ? "এডিট" : "Edit"} {NUMERALS[i]}
          </p>
          <h3 className="mt-2 font-heading text-[46px] font-bold leading-none tracking-[-0.045em] md:mt-3 md:text-[60px]">{label}</h3>
        </div>
        <span className="absolute bottom-7 right-7 grid h-11 w-11 scale-50 place-items-center rounded-full bg-accent text-accent-foreground opacity-0 transition-all duration-500 ease-[var(--ease-out-expo)] group-hover:scale-100 group-hover:opacity-100 md:bottom-10 md:right-10" aria-hidden>
          <ArrowUpRight className="h-5 w-5" />
        </span>
      </Link>
    </motion.div>
  );
}

export function Edits({ c, images }: { c: SectionContent<"edits">; images: Record<string, string | null> }) {
  const { locale, t } = useStore();
  const L = (en: string, bn: string) => (locale === "bn" && bn ? bn : en);
  if (!c.items.length) return null;
  return (
    <section className="section-y">
      <div className="container-x">
        <SectionHeading eyebrow={L(c.eyebrow, c.eyebrowBn) || undefined} title={L(c.title, c.titleBn)} href={c.href || undefined} linkLabel={t.home.viewAll} />
        <Stagger className="grid gap-4 md:grid-cols-3 md:gap-5" gap={0.1}>
          {c.items.map((item, i) => (
            <EditCard key={i} item={item} image={item.productSlug ? images[item.productSlug] ?? null : null} i={i} />
          ))}
        </Stagger>
      </div>
    </section>
  );
}
