"use client";

import { imgSrc } from "@/lib/images";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { SectionContent } from "@/lib/cms/sections";
import { useStore } from "../store-provider";
import { FadeUp } from "../motion";

/** Dark promotional banner. `{maxOff}` in copy is the largest live discount (computed server-side). */
export function EditorialBanner({ c, productImage, maxOff }: { c: SectionContent<"editorial_banner">; productImage: string | null; maxOff: number }) {
  const { locale } = useStore();
  const reduce = useReducedMotion();
  const L = (en: string, bn: string) => (locale === "bn" && bn ? bn : en);
  const fill = (s: string) => s.replaceAll("{maxOff}", String(maxOff));
  const headline = L(c.headline, c.headlineBn);
  const at = headline.indexOf("{maxOff}");
  // Highlight from the discount figure to the end of the line ("Up to **30% Off**").
  const lead = at >= 0 ? headline.slice(0, at) : headline;
  const hot = at >= 0 ? fill(headline.slice(at)) : "";
  const src = c.imageUrl ?? productImage;

  return (
    <section className="section-y">
      <div className="container-x">
        <FadeUp>
          <div className="relative grid min-h-[360px] overflow-hidden rounded-[1.75rem] text-white md:min-h-[400px] md:grid-cols-[1.1fr_1fr] lg:min-h-[440px]" style={{ background: c.bgColor }}>
            <div className="absolute inset-0 bg-[radial-gradient(60%_90%_at_78%_55%,rgba(255,255,255,.10),transparent_65%)]" aria-hidden />
            <div className="relative z-10 flex flex-col justify-center p-8 md:p-14 lg:p-20">
              <p className="text-[12px] font-light uppercase tracking-[0.42em] text-white/60 md:text-[13px]">{L(c.eyebrow, c.eyebrowBn)}</p>
              <h2 className="mt-5 font-heading text-[42px] font-bold leading-[1.02] tracking-[-0.04em] md:text-[58px] lg:text-[64px]">
                {lead}
                {hot && <span className="text-accent">{hot}</span>}
              </h2>
              <p className="mt-5 max-w-md text-[16px] font-light leading-relaxed text-white/65 md:text-[18px]">{fill(L(c.body, c.bodyBn))}</p>
              <div className="mt-8 md:mt-10">
                <Link href={c.ctaHref} className="group inline-flex h-12 items-center gap-2.5 rounded-full bg-accent px-7 text-[15px] font-semibold text-accent-foreground transition active:scale-[0.97] md:h-14 md:px-8 md:text-[16px]">
                  {L(c.ctaLabel, c.ctaLabelBn)}
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
            {src && (
              <div className="relative h-[300px] md:h-auto">
                <motion.div
                  className="absolute left-1/2 top-[6%] w-[62%] max-w-[360px] -translate-x-1/2 md:top-[10%] md:w-[58%]"
                  style={{ transformOrigin: "50% 0%" }}
                  initial={reduce ? false : { rotate: 10, y: -30, opacity: 0 }}
                  whileInView={{ rotate: 0, y: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ type: "spring", stiffness: 55, damping: 7, delay: 0.2 }}
                >
                  <svg viewBox="0 0 120 60" className="absolute left-1/2 top-0 w-[48%] -translate-x-1/2 -translate-y-[40%] text-white/70" aria-hidden>
                    <path d="M60 30 V20 c0-5 7-6 7-12 a7 7 0 0 0-14 0" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
                    <path d="M60 28 L6 52 Q2 55 7 56 H113 Q118 55 114 52 Z" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinejoin="round" />
                  </svg>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imgSrc(src, 640, { transparent: true })} alt="" loading="lazy" decoding="async" className="w-full drop-shadow-[0_30px_40px_rgba(0,0,0,.55)]" />
                  {/* Kraft price tag hanging from the collar */}
                  <motion.div
                    className="absolute left-[60%] top-[22%] w-[30%]"
                    style={{ transformOrigin: "20% 0%" }}
                    initial={reduce ? false : { rotate: -24 }}
                    whileInView={{ rotate: [-24, 10, -6, 3, 0] }}
                    viewport={{ once: true }}
                    transition={{ duration: 2.4, delay: 0.6, ease: "easeOut" }}
                    aria-hidden
                  >
                    <svg viewBox="0 0 100 150" className="w-full overflow-visible drop-shadow-[0_10px_14px_rgba(0,0,0,.4)]">
                      <path d="M20 -40 Q 22 0 26 12" stroke="#e9dcc6" strokeWidth="1.6" fill="none" />
                      <path d="M10 22 L26 8 L90 8 Q96 8 96 14 L96 140 Q96 146 90 146 L16 146 Q10 146 10 140 Z" fill="#c9a27a" />
                      <path d="M10 22 L26 8 L90 8 Q96 8 96 14 L96 140 Q96 146 90 146 L16 146 Q10 146 10 140 Z" fill="url(#kraft)" opacity=".35" />
                      <defs>
                        <linearGradient id="kraft" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#fff" /><stop offset="1" stopColor="#000" /></linearGradient>
                      </defs>
                      <circle cx="26" cy="22" r="5" fill="#18181b" />
                      <text x="53" y="78" textAnchor="middle" fontFamily="var(--font-oswald), 'Arial Narrow', sans-serif" fontWeight="700" fontSize="34" fill="#fff8ee">{maxOff}%</text>
                      <text x="53" y="114" textAnchor="middle" fontFamily="var(--font-oswald), 'Arial Narrow', sans-serif" fontWeight="700" fontSize="30" fill="#fff8ee">OFF</text>
                    </svg>
                  </motion.div>
                </motion.div>
              </div>
            )}
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
