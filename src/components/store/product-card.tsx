"use client";

import { imgSrc, imgSrcSet } from "@/lib/images";
import * as React from "react";
import Link from "next/link";
import { Heart, Plus, Eye, Sparkles } from "lucide-react";
import { useStore } from "./store-provider";
import { useReveal } from "./reveal";
import type { ProductCard as Card } from "@/lib/catalog/queries";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";

function SizePicker({ p, onPick, busy }: { p: Card; onPick: (variantId: string) => void; busy?: string | null }) {
  // One colour per card list view: prefer the first colour's variants.
  const color = p.colors[0]?.name;
  const variants = p.variants.filter((v) => v.color === color);
  return (
    <div className="flex flex-wrap gap-1.5">
      {variants.map((v) => (
        <button
          key={v.id}
          disabled={v.stock <= 0 || !!busy}
          onClick={(e) => {
            e.preventDefault();
            onPick(v.id);
          }}
          className={cn(
            "h-9 min-w-11 rounded-full border border-border bg-surface px-3 text-[13px] font-medium transition hover:border-foreground disabled:text-muted-foreground/50 disabled:line-through disabled:hover:border-border",
            busy === v.id && "animate-pulse",
          )}
          aria-label={`Add size ${v.size}`}
        >
          {v.size}
        </button>
      ))}
    </div>
  );
}

export function ProductCard({ p, priority, index = 0 }: { p: Card; priority?: boolean; index?: number }) {
  const { t, money, wishlist, toggleWishlist, addToCart } = useStore();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [quickView, setQuickView] = React.useState(false);
  const [mobileAdd, setMobileAdd] = React.useState(false);
  const saved = wishlist.has(p.id);
  const revealRef = useReveal<HTMLElement>();

  const quickAdd = async (variantId: string) => {
    setBusy(variantId);
    await addToCart(variantId, 1, { productName: p.name });
    setBusy(null);
    setMobileAdd(false);
    setQuickView(false);
  };

  return (
    <article ref={revealRef} data-reveal="" style={{ ["--reveal-i" as string]: Math.min(index, 6) }} className="pc group relative">
      <div className="relative">
      <Link href={`/products/${p.slug}`} className="block" aria-label={p.name}>
        <div className="img-zoom relative overflow-hidden rounded-[var(--radius)] bg-muted" style={{ aspectRatio: "var(--card-ratio, 4/5)" }}>
          {p.image && (
            // Catalog art is vector (SVG) or merchant-uploaded imagery; rendered with native lazy-loading.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imgSrc(p.image, 640)} srcSet={imgSrcSet(p.image)} sizes="(min-width: 1024px) 25vw, 50vw" alt={p.name} loading={priority ? "eager" : "lazy"} fetchPriority={priority && index < 2 ? "high" : "auto"} decoding="async" className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500 group-hover:opacity-0" />
          )}
          {p.hoverImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imgSrc(p.hoverImage, 640)} srcSet={imgSrcSet(p.hoverImage)} sizes="(min-width: 1024px) 25vw, 50vw" alt="" aria-hidden loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          )}
          <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
            {p.percentOff > 0 && <span className="rounded-full bg-sale px-2 py-0.5 text-[11px] font-semibold text-white">−{p.percentOff}%</span>}
            {p.isNew && <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold">{t.product.new}</span>}
            {!p.inStock && <span className="rounded-full bg-foreground/80 px-2 py-0.5 text-[11px] font-semibold text-background">{t.product.outOfStock}</span>}
          </div>
          {/* Desktop quick add */}
          {p.inStock && (
            <div className="absolute inset-x-3 bottom-3 hidden translate-y-3 rounded-[calc(var(--radius)*0.8)] bg-surface p-3 opacity-0 shadow-lg transition-all duration-500 ease-[var(--ease-out-expo)] group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 md:block">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t.product.quickAdd}</p>
              <SizePicker p={p} onPick={quickAdd} busy={busy} />
            </div>
          )}
        </div>
      </Link>

      <div className="absolute right-3 top-3 flex flex-col gap-2">
        <button
          onClick={() => toggleWishlist(p.id, p.name)}
          className="grid h-9 w-9 place-items-center rounded-full bg-surface shadow-sm transition hover:scale-105 active:scale-90"
          aria-label={saved ? `Remove ${p.name} from wishlist` : `Save ${p.name} to wishlist`}
          aria-pressed={saved}
        >
          <Heart className={cn("h-4 w-4 transition", saved && "fill-sale text-sale")} />
        </button>
        <button
          onClick={() => setQuickView(true)}
          className="hidden h-9 w-9 place-items-center rounded-full bg-surface opacity-0 shadow-sm transition group-hover:opacity-100 focus:opacity-100 md:grid"
          aria-label={`${t.product.quickView}: ${p.name}`}
        >
          <Eye className="h-4 w-4" />
        </button>
      </div>
      {p.inStock && (
        <button
          onClick={() => setMobileAdd(true)}
          className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-surface shadow-md md:hidden"
          aria-label={`${t.product.quickAdd}: ${p.name}`}
        >
          <Plus className="h-4 w-4" />
        </button>
      )}
      </div>

      <div className="mt-3.5 space-y-1 px-0.5">
        <div className="flex items-start justify-between gap-3">
          <Link href={`/products/${p.slug}`} className="line-clamp-2 text-[14px] font-medium leading-snug hover:underline hover:underline-offset-4">
            {p.name}
          </Link>
        </div>
        <p className="text-[13px] text-muted-foreground">{[p.teamName ?? p.categoryName, p.season].filter(Boolean).join(" · ")}</p>
        <div className="flex items-center gap-2 pt-0.5">
          <span className={cn("text-[15px] font-semibold tabular", p.original && "text-sale")}>{money(p.price)}</span>
          {p.original && <span className="text-[13px] text-muted-foreground line-through tabular">{money(p.original)}</span>}
        </div>
        <div className="flex items-center gap-2 pt-1">
          {p.colors.length > 1 && (
            <div className="flex -space-x-1">
              {p.colors.slice(0, 4).map((c) => (
                <span key={c.name} className="h-3.5 w-3.5 rounded-full border-2 border-background" style={{ background: c.hex }} title={c.name} />
              ))}
            </div>
          )}
          {p.customizable && <span className="text-[11px] font-medium text-muted-foreground">+ Name &amp; number</span>}
          {p.tryOnEnabled && (
            <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-muted-foreground">
              <Sparkles className="h-3 w-3" /> Try-on
            </span>
          )}
        </div>
      </div>

      {quickView && <Dialog open={quickView} onOpenChange={setQuickView}>
        <DialogContent title={p.name} className="max-w-3xl p-0" showTitle={false}>
          <div className="grid md:grid-cols-2">
            <div className="aspect-[4/5] bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {p.image && <img src={imgSrc(p.image, 960)} alt={p.name} className="h-full w-full object-cover" />}
            </div>
            <div className="flex flex-col p-6 md:p-8">
              <p className="text-[13px] text-muted-foreground">{[p.teamName ?? p.categoryName, p.season].filter(Boolean).join(" · ")}</p>
              <h3 className="mt-1 font-heading text-2xl font-bold">{p.name}</h3>
              <div className="mt-3 flex items-center gap-2">
                <span className={cn("text-xl font-semibold tabular", p.original && "text-sale")}>{money(p.price)}</span>
                {p.original && <span className="text-muted-foreground line-through tabular">{money(p.original)}</span>}
              </div>
              <p className="mb-3 mt-8 text-sm font-medium">{t.product.selectSize}</p>
              <SizePicker p={p} onPick={quickAdd} busy={busy} />
              <div className="mt-auto pt-8">
                <Button asChild variant="outline" block>
                  <Link href={`/products/${p.slug}`}>{t.product.details}</Link>
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>}

      {mobileAdd && <Sheet open={mobileAdd} onOpenChange={setMobileAdd}>
        <SheetContent side="bottom" title={t.product.selectSize}>
          <div className="p-6 pb-10">
            <p className="font-heading text-lg font-bold">{p.name}</p>
            <p className="mb-5 text-sm text-muted-foreground tabular">{money(p.price)}</p>
            <p className="mb-3 text-sm font-medium">{t.product.selectSize}</p>
            <SizePicker p={p} onPick={quickAdd} busy={busy} />
          </div>
        </SheetContent>
      </Sheet>}
    </article>
  );
}

export function ProductGrid({ items, className, priorityCount = 0 }: { items: Card[]; className?: string; priorityCount?: number }) {
  return (
    <div className={cn("grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 lg:grid-cols-4", className)}>
      {items.map((p, i) => (
        <ProductCard key={p.id} p={p} index={i % 4} priority={i < priorityCount} />
      ))}
    </div>
  );
}
