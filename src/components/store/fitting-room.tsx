"use client";

import { imgSrc } from "@/lib/images";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Maximize2, Minimize2, RotateCcw, Sparkles, X } from "lucide-react";
import { useStore } from "./store-provider";
import { useFittingRoom, type WornItem } from "./fitting-room-context";
import { HangerIcon } from "./icons";
import { EASE } from "./motion";
import { cn } from "@/lib/utils";

const HIDDEN_ON = ["/checkout", "/try-on", "/customize", "/cart"];

/** Original dress-form illustration. The jersey art is laid over it with its shoulders on the form's shoulders. */
function DressForm({ worn, reduce }: { worn: WornItem | null; reduce: boolean | null }) {
  return (
    <svg viewBox="-20 0 480 720" className="h-full w-full" role="img" aria-label={worn ? `${worn.name} on a dress form` : "Empty dress form"}>
      <defs>
        <linearGradient id="fr-body" x1="0" x2="1">
          <stop offset="0" stopColor="#b9b6b0" />
          <stop offset=".28" stopColor="#e4e1db" />
          <stop offset=".52" stopColor="#f3f1ec" />
          <stop offset=".78" stopColor="#d9d6d0" />
          <stop offset="1" stopColor="#aeaba5" />
        </linearGradient>
        <linearGradient id="fr-wood" x1="0" x2="1">
          <stop offset="0" stopColor="#4a3424" />
          <stop offset=".5" stopColor="#8a6544" />
          <stop offset="1" stopColor="#3f2c1e" />
        </linearGradient>
        <radialGradient id="fr-floor" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#000" stopOpacity=".28" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="220" cy="700" rx="130" ry="16" fill="url(#fr-floor)" />
      {/* Stand */}
      <path d="M220 640 L150 694 M220 640 L290 694 M220 640 L220 704" stroke="url(#fr-wood)" strokeWidth="9" strokeLinecap="round" />
      <rect x="213" y="486" width="14" height="160" rx="5" fill="url(#fr-wood)" />
      <rect x="205" y="600" width="30" height="10" rx="4" fill="#2f2219" />
      {/* Neck & finial */}
      <circle cx="220" cy="38" r="7" fill="url(#fr-wood)" />
      <ellipse cx="220" cy="52" rx="20" ry="9" fill="url(#fr-wood)" />
      <path d="M202 56 Q200 88 198 114 L242 114 Q240 88 238 56 Z" fill="url(#fr-body)" />
      {/* Torso */}
      <path
        d="M198 112 C170 118 132 124 114 140 C102 152 100 172 104 196 C108 222 98 250 102 280 C106 316 124 338 126 362 C128 392 108 424 108 456 L110 486 L330 486 L332 456 C332 424 312 392 314 362 C316 338 334 316 338 280 C342 250 332 222 336 196 C340 172 338 152 326 140 C308 124 270 118 242 112 Z"
        fill="url(#fr-body)"
      />
      <path d="M170 128 C176 220 158 300 166 486 M270 128 C264 220 282 300 274 486" stroke="#000" strokeOpacity=".07" strokeWidth="2" fill="none" />
      <path d="M220 116 V486" stroke="#000" strokeOpacity=".05" strokeWidth="2" />
      <ellipse cx="220" cy="486" rx="110" ry="10" fill="url(#fr-wood)" />
      <AnimatePresence mode="popLayout">
        {worn?.image && (
          <motion.g
            key={worn.slug}
            initial={reduce ? false : { opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 80, transition: { duration: 0.3 } }}
            transition={{ type: "spring", stiffness: 120, damping: 15 }}
          >
            <image href={imgSrc(worn.image, 640, { transparent: true })} x={-12} y={33} width={464} height={580} preserveAspectRatio="xMidYMin meet" />
          </motion.g>
        )}
      </AnimatePresence>
    </svg>
  );
}

function MiniForm() {
  return (
    <svg viewBox="60 20 320 520" className="h-full w-full" aria-hidden>
      <path d="M202 56 Q200 88 198 114 L242 114 Q240 88 238 56 Z" fill="#d6d3cd" />
      <path d="M198 112 C170 118 132 124 114 140 C102 152 100 172 104 196 C108 222 98 250 102 280 C106 316 124 338 126 362 C128 392 108 424 108 456 L110 486 L330 486 L332 456 C332 424 312 392 314 362 C316 338 334 316 338 280 C342 250 332 222 336 196 C340 172 338 152 326 140 C308 124 270 118 242 112 Z" fill="#e7e4de" />
      <ellipse cx="220" cy="52" rx="20" ry="9" fill="#8a6544" />
    </svg>
  );
}

export function FittingRoom() {
  const ctx = useFittingRoom();
  const { t, money } = useStore();
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const [large, setLarge] = React.useState(false);
  if (!ctx || HIDDEN_ON.some((p) => pathname.startsWith(p))) return null;
  const { open, setOpen, worn, clear } = ctx;

  return (
    <div className="pointer-events-none fixed bottom-3 left-3 z-40 md:bottom-5 md:left-5">
      <AnimatePresence mode="popLayout" initial={false}>
        {open ? (
          <motion.div
            key="panel"
            layoutId="fitting-room"
            className={cn("pointer-events-auto origin-bottom-left overflow-hidden rounded-[1.6rem] bg-surface shadow-[0_30px_80px_-30px_rgba(16,24,40,.45)] ring-1 ring-border", large ? "w-[min(440px,calc(100vw-1.5rem))]" : "w-[min(330px,calc(100vw-1.5rem))]")}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            role="dialog"
            aria-label="Fitting room"
          >
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12, duration: 0.3 }} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-heading text-[18px] font-semibold tracking-[-0.02em]">{t.fitting.title}</p>
                  <p className="mt-1 text-[13px] leading-snug text-muted-foreground">{t.fitting.hint}</p>
                </div>
                <button onClick={() => setOpen(false)} className="-mr-1 -mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full transition hover:bg-muted" aria-label={t.nav.close}>
                  <X className="h-[18px] w-[18px]" />
                </button>
              </div>

              <div className="relative mt-4 aspect-[4/5] overflow-hidden rounded-[1.1rem] bg-[radial-gradient(90%_70%_at_50%_35%,#d7d8db,#a7a9ae)]">
                <div className="absolute inset-x-[6%] bottom-0 top-[4%]">
                  <DressForm worn={worn} reduce={reduce} />
                </div>
                <AnimatePresence>
                  {worn && (
                    <motion.div
                      key={worn.slug}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4, ease: EASE, delay: 0.2 }}
                      className="absolute left-3 top-3 max-w-[70%] rounded-full bg-surface/90 px-3 py-1.5 text-[12px] font-medium shadow-sm backdrop-blur"
                    >
                      <span className="line-clamp-1">{worn.name}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
                <button onClick={() => setLarge((v) => !v)} className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-foreground/80 text-background backdrop-blur transition hover:bg-foreground" aria-label={large ? "Smaller preview" : "Larger preview"}>
                  {large ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>
              </div>

              {worn ? (
                <>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <Link href={`/products/${worn.slug}`} className="min-w-0 text-[14px] font-medium hover:underline">
                      <span className="line-clamp-1">{worn.name}</span>
                    </Link>
                    <span className="shrink-0 text-[15px] font-semibold tabular">{money(worn.price)}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    {worn.tryOnEnabled ? (
                      <Link href={`/try-on?product=${worn.slug}`} className="inline-flex h-10 items-center gap-2 rounded-full bg-accent px-4 text-[13.5px] font-semibold text-accent-foreground transition active:scale-[0.97]">
                        <Sparkles className="h-4 w-4" /> {t.fitting.tryAi}
                      </Link>
                    ) : (
                      <Link href={`/products/${worn.slug}`} className="inline-flex h-10 items-center gap-2 rounded-full bg-accent px-4 text-[13.5px] font-semibold text-accent-foreground transition active:scale-[0.97]">
                        {t.product.details} <ArrowRight className="h-4 w-4" />
                      </Link>
                    )}
                    <button onClick={clear} className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-accent-ink hover:underline">
                      <RotateCcw className="h-3.5 w-3.5" /> {t.fitting.startOver}
                    </button>
                  </div>
                </>
              ) : (
                <div className="mt-4 flex items-center justify-between gap-3">
                  <Link href="/shop" className="inline-flex h-10 items-center gap-2 rounded-full bg-accent px-4 text-[13.5px] font-semibold text-accent-foreground transition active:scale-[0.97]">
                    <HangerIcon className="h-4 w-4" /> {t.fitting.browse}
                  </Link>
                  <Link href="/try-on" className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-accent-ink hover:underline">
                    <Sparkles className="h-3.5 w-3.5" /> {t.fitting.aiLink}
                  </Link>
                </div>
              )}
              <p className="mt-3 text-[11px] leading-snug text-muted-foreground">{t.fitting.disclaimer}</p>
            </motion.div>
          </motion.div>
        ) : (
          <motion.button
            key="pill"
            layoutId="fitting-room"
            onClick={() => setOpen(true)}
            className="pointer-events-auto flex h-14 items-center gap-3 rounded-full bg-surface pl-1.5 pr-5 shadow-[0_18px_40px_-18px_rgba(16,24,40,.45)] ring-1 ring-border md:h-[60px]"
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            aria-label={t.fitting.open}
          >
            <span className="relative grid h-11 w-11 place-items-center overflow-hidden rounded-full bg-[radial-gradient(circle_at_50%_30%,#d3d4d7,#9b9da2)] md:h-12 md:w-12">
              {worn?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imgSrc(worn.image, 320, { transparent: true })} alt="" className="h-[86%] w-[86%] object-contain" />
              ) : (
                <span className="h-[88%] w-[88%] pt-1">
                  <MiniForm />
                </span>
              )}
            </span>
            <span className="text-[15px] font-medium">{t.fitting.pill}</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
