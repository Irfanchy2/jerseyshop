"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SectionContent } from "@/lib/cms/sections";
import { useStore } from "../store-provider";

type Featured = { slug: string; name: string; image: string | null; price: number; teamName: string | null };

export function Hero({ c, featured }: { c: SectionContent<"hero">; featured: Featured[] }) {
  const { locale, money } = useStore();
  const reduce = useReducedMotion();
  const L = (en: string, bn: string) => (locale === "bn" && bn ? bn : en);
  const stage = React.useRef<HTMLDivElement>(null);

  // GSAP ScrollTrigger: subtle parallax drift of the jersey stage as the hero scrolls away.
  React.useEffect(() => {
    if (reduce || !stage.current) return;
    let ctx: { revert: () => void } | undefined;
    (async () => {
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      gsap.registerPlugin(ScrollTrigger);
      ctx = gsap.context(() => {
        gsap.utils.toArray<HTMLElement>("[data-depth]").forEach((el) => {
          gsap.to(el, {
            yPercent: -Number(el.dataset.depth) * 14,
            ease: "none",
            scrollTrigger: { trigger: stage.current, start: "top top", end: "bottom top", scrub: true },
          });
        });
      }, stage);
    })();
    return () => ctx?.revert();
  }, [reduce]);

  const dark = c.tone === "dark";
  const words = L(c.headline, c.headlineBn).split(" ");

  return (
    <section className="relative overflow-hidden" style={{ background: c.bgColor, color: dark ? "#f5f3ee" : "#121212" }}>
      {c.videoUrl ? (
        <video className="absolute inset-0 h-full w-full object-cover opacity-60" src={c.videoUrl} autoPlay muted loop playsInline aria-hidden />
      ) : c.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={c.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" fetchPriority="high" />
      ) : null}
      <div className="pointer-events-none absolute inset-0" style={{ background: dark ? "radial-gradient(80% 60% at 75% 40%, rgba(255,255,255,.08), transparent 60%)" : "radial-gradient(80% 60% at 75% 40%, rgba(255,255,255,.6), transparent 60%)" }} />
      <div ref={stage} className="container-x relative grid min-h-[calc(100svh-6.25rem)] items-center gap-10 py-14 md:min-h-[720px] lg:grid-cols-12 lg:py-20">
        <div className="relative z-10 lg:col-span-6">
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-6 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-semibold uppercase tracking-[0.16em]" style={{ borderColor: dark ? "rgba(255,255,255,.2)" : "rgba(0,0,0,.15)" }}>
            <span className="h-1.5 w-1.5 rounded-full bg-[#c8f169]" /> {L(c.eyebrow, c.eyebrowBn)}
          </motion.p>
          <h1 className="font-heading text-[44px] font-extrabold leading-[0.98] tracking-[-0.035em] sm:text-[64px] xl:text-[84px]">
            {words.map((w, i) => (
              <span key={i} className="inline-block overflow-hidden pb-1 align-bottom">
                <motion.span className="inline-block" initial={{ y: "105%" }} animate={{ y: 0 }} transition={{ duration: 0.9, delay: 0.1 + i * 0.07, ease: [0.16, 1, 0.3, 1] }}>
                  {w}&nbsp;
                </motion.span>
              </span>
            ))}
          </h1>
          <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.5 }} className="mt-6 max-w-lg text-[16px] leading-relaxed opacity-75 md:text-[18px]">
            {L(c.sub, c.subBn)}
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.62 }} className="mt-9 flex flex-wrap gap-3">
            <Button asChild size="lg" variant={dark ? "inverse" : "primary"}>
              <Link href={c.ctaHref}>
                {L(c.ctaLabel, c.ctaLabelBn)} <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            {c.secondaryLabel && (
              <Button asChild size="lg" variant="outline" className={dark ? "border-white/30 text-white hover:border-white hover:bg-white/5" : ""}>
                <Link href={c.secondaryHref}>{L(c.secondaryLabel, c.secondaryLabelBn)}</Link>
              </Button>
            )}
          </motion.div>
        </div>

        {!c.imageUrl && !c.videoUrl && featured.length > 0 && (
          <div className="relative h-[420px] sm:h-[520px] lg:col-span-6 lg:h-[640px]" aria-hidden={false}>
            {featured.slice(0, 3).map((p, i) => {
              const pos = [
                "left-1/2 top-0 z-20 w-[62%] -translate-x-1/2",
                "left-0 top-[22%] z-10 w-[44%] -rotate-[8deg] opacity-95",
                "right-0 top-[18%] z-10 w-[44%] rotate-[7deg] opacity-95",
              ][i];
              return (
                <motion.div
                  key={p.slug}
                  data-depth={i === 0 ? 1 : 2.4}
                  className={`absolute ${pos}`}
                  initial={{ opacity: 0, y: 60, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 1.2, delay: 0.25 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                >
                  <motion.div animate={reduce ? undefined : { y: [0, i === 0 ? -10 : -6, 0] }} transition={{ duration: 6 + i, repeat: Infinity, ease: "easeInOut" }}>
                    <Link href={`/products/${p.slug}`} className="block" aria-label={p.name}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.image ? `${p.image}?bg=none` : ""} alt={p.name} className="w-full drop-shadow-[0_40px_60px_rgba(0,0,0,.35)]" fetchPriority={i === 0 ? "high" : "auto"} />
                    </Link>
                  </motion.div>
                </motion.div>
              );
            })}
            {featured[0] && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.1, duration: 0.8 }} className="absolute bottom-2 right-0 z-30 hidden rounded-2xl bg-white/95 p-3 pr-5 text-black shadow-2xl backdrop-blur sm:flex sm:items-center sm:gap-3">
                <div className="h-14 w-12 overflow-hidden rounded-lg bg-[#efece6]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {featured[0].image && <img src={featured[0].image} alt="" className="h-full w-full object-cover" />}
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-black/50">{featured[0].teamName ?? "Featured"}</p>
                  <p className="max-w-[180px] truncate text-sm font-semibold">{featured[0].name}</p>
                  <p className="text-sm tabular">{money(featured[0].price)}</p>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
