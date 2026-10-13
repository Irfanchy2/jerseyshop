"use client";

import { imgSrc, imgSrcSet } from "@/lib/images";
import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, Star, X } from "lucide-react";
import { useStore } from "./store-provider";
import { useFittingRoom } from "./fitting-room-context";
import { BagPlusIcon, HangerIcon } from "./icons";
import { EASE, Stagger, staggerItem } from "./motion";
import type { ProductCard as Card } from "@/lib/catalog/queries";
import { cn } from "@/lib/utils";

/** Generated catalog art is a transparent cut-out, so it can be "worn" on the fitting-room form. */
const isCutout = (url: string | null) => !!url && url.startsWith("/art/jersey/");

function SizePanel({ p, busy, onPick, onClose }: { p: Card; busy: string | null; onPick: (variantId: string) => void; onClose: () => void }) {
  const { t } = useStore();
  const color = p.colors[0]?.name;
  const variants = p.variants.filter((v) => v.color === color);
  return (
    <motion.div
      initial={{ y: "105%" }}
      animate={{ y: 0 }}
      exit={{ y: "105%" }}
      transition={{ duration: 0.45, ease: EASE }}
      className="absolute inset-x-2 bottom-2 z-20 rounded-[1.25rem] bg-surface p-4 shadow-[0_18px_40px_-18px_rgba(16,24,40,.35)] ring-1 ring-border"
      role="dialog"
      aria-label={`${t.product.selectSize}: ${p.name}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{t.product.selectSize}</p>
        <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-full bg-muted" aria-label={t.nav.close}>
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {variants.map((v) => (
          <button
            key={v.id}
            disabled={v.stock <= 0 || !!busy}
            onClick={() => onPick(v.id)}
            className={cn(
              "h-9 min-w-11 rounded-full bg-muted px-3 text-[13px] font-semibold transition hover:bg-accent hover:text-accent-foreground disabled:bg-muted disabled:text-muted-foreground/50 disabled:line-through",
              busy === v.id && "animate-pulse",
            )}
            aria-label={`Add size ${v.size}`}
          >
            {v.size}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

export function ProductCard({ p, priority, index = 0, compact }: { p: Card; priority?: boolean; index?: number; compact?: boolean }) {
  const { t, money, wishlist, toggleWishlist, addToCart } = useStore();
  const fitting = useFittingRoom();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [sizesOpen, setSizesOpen] = React.useState(false);
  const saved = wishlist.has(p.id);
  const cutout = isCutout(p.image);

  const add = async (variantId: string) => {
    setBusy(variantId);
    await addToCart(variantId, 1, { productName: p.name });
    setBusy(null);
    setSizesOpen(false);
  };
  const onBag = () => {
    const inStock = p.variants.filter((v) => v.stock > 0);
    if (inStock.length === 1) add(inStock[0].id);
    else setSizesOpen(true);
  };

  return (
    <motion.article variants={staggerItem} className={cn("group relative", compact && "h-full")}>
      <div className={cn("pc-frame relative overflow-hidden rounded-[1.4rem] bg-surface transition-shadow duration-500 hover:shadow-[0_24px_50px_-30px_rgba(16,24,40,.35)] md:rounded-[1.75rem]", compact && "flex h-full flex-col")}>
        <Link href={`/products/${p.slug}`} className={cn("block", compact && "flex flex-1 flex-col")} aria-label={p.name}>
          <div className={cn("relative", compact ? "aspect-square sm:aspect-[5/4] lg:aspect-auto lg:min-h-[240px] lg:flex-1" : "aspect-square sm:aspect-[5/4]")}>
            {p.image && (
              // Catalog art is a generated cut-out (or merchant imagery) served at fixed widths.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imgSrc(p.image, 640, { transparent: cutout })}
                srcSet={imgSrcSet(p.image, { transparent: cutout })}
                sizes="(min-width: 1024px) 30vw, 50vw"
                alt={p.name}
                loading={priority ? "eager" : "lazy"}
                fetchPriority={priority && index < 2 ? "high" : "auto"}
                decoding="async"
                className={cn(
                  "absolute inset-0 h-full w-full transition-transform duration-[900ms] ease-[var(--ease-out-expo)] group-hover:-translate-y-1.5 group-hover:scale-[1.045]",
                  cutout ? "object-contain p-[9%] pb-[4%]" : "object-cover",
                )}
              />
            )}
          </div>
        </Link>

        {/* Top-left: wishlist + fitting room */}
        <div className="absolute left-3 top-3 flex flex-col gap-2 md:left-5 md:top-5">
          <button
            onClick={() => toggleWishlist(p.id, p.name)}
            className="grid h-9 w-9 place-items-center rounded-full bg-muted transition hover:scale-105 active:scale-90 md:h-10 md:w-10"
            aria-label={saved ? `Remove ${p.name} from wishlist` : `Save ${p.name} to wishlist`}
            aria-pressed={saved}
          >
            <Heart className={cn("h-[17px] w-[17px] transition", saved && "fill-sale text-sale")} />
          </button>
          {fitting && cutout && (
            <button
              onClick={() => fitting.wear({ id: p.id, slug: p.slug, name: p.name, image: p.image, price: p.price, tryOnEnabled: p.tryOnEnabled })}
              className="hidden h-9 w-9 place-items-center rounded-full bg-muted transition hover:scale-105 active:scale-90 sm:grid md:h-10 md:w-10 md:-translate-y-1 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
              aria-label={`Put ${p.name} on the fitting-room form`}
              title="Wear it in the fitting room"
            >
              <HangerIcon className="h-[17px] w-[17px]" />
            </button>
          )}
        </div>

        {/* Top-right: rating or stock state */}
        <div className="absolute right-3 top-3 md:right-5 md:top-5">
          {!p.inStock ? (
            <span className="rounded-full bg-foreground px-2.5 py-1 text-[11px] font-semibold text-background">{t.product.outOfStock}</span>
          ) : p.rating != null ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-[12px] font-medium tabular md:text-[13px]" aria-label={`Rated ${p.rating} out of 5 from ${p.ratingCount} reviews`}>
              <Star className="h-3.5 w-3.5 fill-accent text-accent" /> {p.rating.toFixed(1)}
            </span>
          ) : null}
        </div>

        <div className={cn("relative px-4 pb-4 md:px-6 md:pb-6", compact && "md:pb-5")}>
          <Link href={`/products/${p.slug}`} className="block pr-8 md:pr-12">
            <h3 className="line-clamp-2 sm:line-clamp-1 font-sans text-[13px] font-normal tracking-normal text-muted-foreground md:text-[14.5px]">{p.name}</h3>
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 pr-8 md:pr-12">
            <span className={cn("text-[16px] font-semibold tabular md:text-[19px]", p.original && "text-sale")}>{money(p.price)}</span>
            {p.original && <span className="text-[12px] text-muted-foreground line-through tabular md:text-[13px]">{money(p.original)}</span>}
            {p.original && <span className="hidden rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent-ink sm:inline">{t.product.sale}</span>}
          </div>
        </div>

        {/* Bottom-right: quick add with the expanding corner */}
        {p.inStock && (
          <button
            onClick={onBag}
            className="group/bag absolute bottom-0 right-0 z-10 grid h-[68px] w-[68px] place-items-center md:h-[88px] md:w-[88px]"
            aria-label={`${t.product.quickAdd}: ${p.name}`}
          >
            <span className="absolute inset-0 origin-bottom-right scale-0 rounded-tl-[2.2rem] bg-accent transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:scale-100 md:rounded-tl-[2.8rem]" aria-hidden />
            <BagPlusIcon className="relative h-[20px] w-[20px] translate-x-1 translate-y-1 transition-colors duration-300 group-hover:text-accent-foreground md:h-[22px] md:w-[22px]" />
          </button>
        )}

        <AnimatePresence>{sizesOpen && <SizePanel p={p} busy={busy} onPick={add} onClose={() => setSizesOpen(false)} />}</AnimatePresence>
      </div>
    </motion.article>
  );
}

export function ProductGrid({ items, className, priorityCount = 0, columns = 3 }: { items: Card[]; className?: string; priorityCount?: number; columns?: 3 | 4 }) {
  return (
    <Stagger className={cn("grid grid-cols-2 gap-3 sm:gap-5 lg:gap-6", columns === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3", className)} gap={0.07}>
      {items.map((p, i) => (
        <ProductCard key={p.id} p={p} index={i % columns} priority={i < priorityCount} />
      ))}
    </Stagger>
  );
}
