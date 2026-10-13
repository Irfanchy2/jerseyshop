"use client";

import { imgSrc } from "@/lib/images";
import * as React from "react";
import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { SectionContent } from "@/lib/cms/sections";
import { useStore } from "../store-provider";
import { EASE, RiseWords } from "../motion";

type Featured = { slug: string; name: string; image: string | null; price: number; teamName: string | null };

function Hanger() {
  // Hook + shoulder bar; sized so the bar sits on the jersey's shoulder line.
  return (
    <svg viewBox="0 0 120 60" className="absolute left-1/2 top-0 w-[48%] -translate-x-1/2 -translate-y-[10%]" aria-hidden>
      <path d="M60 30 V20 c0-5 7-6 7-12 a7 7 0 0 0-14 0" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M60 28 L6 52 Q2 55 7 56 H113 Q118 55 114 52 Z" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinejoin="round" />
    </svg>
  );
}

function RackJersey({ item, i, n, reduce }: { item: Featured; i: number; n: number; reduce: boolean | null }) {
  const { money } = useStore();
  const [hover, setHover] = React.useState(false);
  const [entered, setEntered] = React.useState(!!reduce);
  // Spread hangers between the poles; later shirts sit in front.
  const left = 2 + (i * 44) / Math.max(1, n - 1);
  return (
    <motion.div
      className="absolute top-[25.4%] w-[54%]"
      style={{ left: `${left}%`, zIndex: hover ? 30 : 10 + i, transformOrigin: "50% 0%", transformStyle: "preserve-3d" }}
      initial={reduce ? false : { y: -70, opacity: 0, rotateY: 58 }}
      animate={{ y: hover ? 18 : 0, opacity: 1, rotateY: hover ? 0 : 58, scale: hover ? 1.08 : 1 }}
      transition={{ type: "spring", stiffness: 140, damping: 18, delay: entered ? 0 : 0.55 + i * 0.09 }}
      onAnimationComplete={() => setEntered(true)}
      onHoverStart={() => setHover(true)}
      onHoverEnd={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
    >
      <motion.div
        style={{ transformOrigin: "50% 0%" }}
        animate={reduce ? undefined : { rotateZ: [0, 1.6, -1.1, 0.5, 0] }}
        transition={{ duration: 3.2 + i * 0.3, repeat: 1, ease: "easeInOut", delay: 1.6 + i * 0.2 }}
        className="relative text-foreground/80"
      >
        <Hanger />
        <Link href={`/products/${item.slug}`} aria-label={item.name} className="block">
          {item.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imgSrc(item.image, 480, { transparent: true })} alt="" className="w-full drop-shadow-[0_18px_22px_rgba(0,0,0,.16)]" fetchPriority={i < 2 ? "high" : "auto"} decoding="async" />
          )}
        </Link>
        <motion.span
          initial={false}
          animate={{ opacity: hover ? 1 : 0, y: hover ? 0 : -6 }}
          transition={{ duration: 0.3, ease: EASE }}
          className="pointer-events-none absolute left-1/2 top-[96%] -translate-x-1/2 whitespace-nowrap rounded-full bg-surface px-3 py-1.5 text-[12px] font-medium shadow-[0_10px_30px_-12px_rgba(0,0,0,.35)]"
        >
          {item.name.replace(/ jersey$/i, "")} · <span className="text-sale">{money(item.price)}</span>
        </motion.span>
      </motion.div>
    </motion.div>
  );
}

function Lamp({ reduce }: { reduce: boolean | null }) {
  return (
    <motion.div
      className="absolute right-[7%] top-0 hidden w-[18%] max-w-[170px] md:block"
      style={{ transformOrigin: "50% 0%" }}
      initial={reduce ? false : { y: -220 }}
      animate={reduce ? undefined : { y: 0, rotate: [0, 2.2, -1.6, 0.8, 0] }}
      transition={{ y: { duration: 1.4, ease: EASE, delay: 0.2 }, rotate: { duration: 3.5, repeat: 1, ease: "easeInOut", delay: 1.6 } }}
      aria-hidden
    >
      <svg viewBox="0 0 160 260" className="w-full text-foreground">
        <defs>
          <radialGradient id="lamp-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#ffd28a" stopOpacity=".95" />
            <stop offset=".45" stopColor="#ffb84d" stopOpacity=".45" />
            <stop offset="1" stopColor="#ffb84d" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="lamp-shade" x1="0" x2="1">
            <stop offset="0" stopColor="#1c1c1e" />
            <stop offset=".45" stopColor="#3a3a3d" />
            <stop offset="1" stopColor="#141416" />
          </linearGradient>
        </defs>
        <line x1="80" y1="0" x2="80" y2="118" stroke="currentColor" strokeWidth="2.4" />
        <rect x="70" y="112" width="20" height="16" rx="3" fill="#1c1c1e" />
        <path d="M74 128 h12 l4 14 h-20 z" fill="#2a2a2d" />
        <path d="M80 140 C 40 142 18 160 10 196 H150 C 142 160 120 142 80 140 Z" fill="url(#lamp-shade)" />
        <ellipse cx="80" cy="196" rx="70" ry="6" fill="#0f0f10" />
        <motion.circle cx="80" cy="214" r="46" fill="url(#lamp-glow)" animate={reduce ? undefined : { opacity: [0.75, 1, 0.8] }} transition={{ duration: 1.6, repeat: 2, repeatType: "reverse", ease: "easeInOut" }} />
        <ellipse cx="80" cy="206" rx="13" ry="16" fill="#ffe7b8" />
        <path d="M74 202 q6 8 12 0" stroke="#d98b2b" strokeWidth="1.6" fill="none" />
        <path d="M24 196 L58 236 M136 196 L102 236 M80 196 V244" stroke="#1c1c1e" strokeWidth="2" opacity=".55" />
      </svg>
    </motion.div>
  );
}

export function Hero({ c, featured }: { c: SectionContent<"hero">; featured: Featured[] }) {
  const { locale } = useStore();
  const reduce = useReducedMotion();
  const L = (en: string, bn: string) => (locale === "bn" && bn ? bn : en);
  const ref = React.useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const rackY = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "-10%"]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "12%"]);

  const rack = featured.slice(0, 6);
  const hook = featured[6] ?? null;
  const bold = L(c.headlineBold, c.headlineBoldBn);

  return (
    <section ref={ref} className="hero-section px-3 pt-3 md:px-4 md:pt-4">
      <div className="relative grid overflow-hidden rounded-[1.75rem] bg-surface pb-14 md:rounded-[2.25rem] lg:min-h-[660px] lg:grid-cols-[1.02fr_1fr] xl:min-h-[720px]">
        {c.imageUrl && (
          // Optional merchant backdrop image behind the composition.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" fetchPriority="high" />
        )}

        <motion.div style={{ y: textY }} className="relative z-10 flex flex-col justify-center px-6 pb-6 pt-12 sm:px-10 lg:pb-16 lg:pl-14 lg:pt-10 xl:pl-[4.5rem]">
          <motion.p
            initial={reduce ? false : { opacity: 0, letterSpacing: "0.9em" }}
            animate={{ opacity: 1, letterSpacing: "0.55em" }}
            transition={{ duration: 1.6, ease: EASE }}
            className="text-[12px] font-light uppercase text-muted-foreground sm:text-[14px] lg:text-[15px]"
          >
            {L(c.eyebrow, c.eyebrowBn)}
          </motion.p>
          <h1 className="mt-6 font-heading leading-[0.92] tracking-[-0.045em] lg:mt-8">
            <RiseWords text={L(c.headline, c.headlineBn)} className="block text-[64px] font-extralight sm:text-[88px] lg:text-[112px] xl:text-[136px]" delay={0.15} />
            {bold && (
              <RiseWords text={bold} className="block whitespace-nowrap text-[60px] font-extrabold italic tracking-[-0.055em] sm:text-[84px] lg:text-[106px] xl:text-[128px]" delay={0.32} />
            )}
          </h1>
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.7, ease: EASE }}
            className="mt-7 max-w-[30rem] text-[16px] font-light leading-[1.6] text-muted-foreground sm:text-[18px] lg:mt-9 lg:text-[20px]"
          >
            {L(c.sub, c.subBn)}
          </motion.p>
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.85, ease: EASE }}
            className="mt-9 flex flex-wrap gap-3 sm:gap-4 lg:mt-12"
          >
            <Link href={c.ctaHref} className="group inline-flex h-12 items-center gap-2.5 rounded-full bg-accent px-7 text-[15px] font-semibold text-accent-foreground transition-[transform,background-color] duration-300 hover:brightness-[1.04] active:scale-[0.97] sm:h-14 sm:px-8 sm:text-[16px]">
              {L(c.ctaLabel, c.ctaLabelBn)}
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            {c.secondaryLabel && (
              <Link href={c.secondaryHref} className="inline-flex h-12 items-center rounded-full border border-border px-7 text-[15px] font-medium transition-colors duration-300 hover:border-foreground sm:h-14 sm:px-8 sm:text-[16px]">
                {L(c.secondaryLabel, c.secondaryLabelBn)}
              </Link>
            )}
          </motion.div>
        </motion.div>

        {/* Rack composition */}
        <motion.div style={{ y: rackY }} className="relative h-[380px] sm:h-[460px] lg:h-auto" aria-label="Featured jerseys">
          <Lamp reduce={reduce} />
          <div className="absolute inset-y-0 left-[2%] w-[78%] [perspective:1400px] lg:left-0 lg:w-[74%]">
            {/* Poles */}
            {["left-[6%]", "right-[6%]"].map((pos, k) => (
              <motion.span
                key={pos}
                className={`absolute top-0 ${pos} h-[90%] w-[7px] origin-top rounded-b-full bg-foreground/90`}
                initial={reduce ? false : { scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 1.1, delay: 0.1 + k * 0.08, ease: EASE }}
                aria-hidden
              />
            ))}
            {/* Rails */}
            {[{ top: "top-[25%]", d: 0.45 }, { top: "top-[84%]", d: 0.6 }].map((r) => (
              <motion.span
                key={r.top}
                className={`absolute ${r.top} left-[4%] right-[4%] h-[9px] rounded-full bg-foreground/90`}
                initial={reduce ? false : { scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 1, delay: r.d, ease: EASE }}
                aria-hidden
              >
                <span className="absolute -left-1 top-1/2 h-[15px] w-[15px] -translate-y-1/2 rounded-full bg-foreground" />
                <span className="absolute -right-1 top-1/2 h-[15px] w-[15px] -translate-y-1/2 rounded-full bg-foreground" />
              </motion.span>
            ))}
            {/* Feet */}
            {[14, 30, 46, 62, 78].map((x, k) => (
              <motion.span
                key={x}
                className="absolute top-[84.6%] h-[3%] w-[2.6%] min-w-2.5 rounded-b-[8px] bg-foreground/80"
                style={{ left: `${x}%` }}
                initial={reduce ? false : { opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.9 + k * 0.05, ease: EASE }}
                aria-hidden
              />
            ))}
            {rack.map((item, i) => (
              <RackJersey key={item.slug} item={item} i={i} n={rack.length} reduce={reduce} />
            ))}
          </div>

          {hook?.image && (
            <motion.div
              className="absolute -right-[5%] bottom-[2%] hidden w-[27%] sm:block"
              style={{ transformOrigin: "50% 0%" }}
              initial={reduce ? false : { rotate: 14, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 60, damping: 6, delay: 1.1 }}
            >
              <Link href={`/products/${hook.slug}`} aria-label={hook.name} className="relative block text-foreground/80">
                <svg viewBox="0 0 40 60" className="absolute left-1/2 top-0 w-[14%] -translate-x-1/2 -translate-y-[85%]" aria-hidden>
                  <rect x="14" y="0" width="12" height="22" rx="4" fill="#b98a5a" />
                  <path d="M20 22 v10 c0 6 8 6 8 12 a8 8 0 0 1-16 0" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                <Hanger />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imgSrc(hook.image, 480, { transparent: true })} alt="" className="w-full drop-shadow-[0_18px_22px_rgba(0,0,0,.16)]" decoding="async" />
              </Link>
            </motion.div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
