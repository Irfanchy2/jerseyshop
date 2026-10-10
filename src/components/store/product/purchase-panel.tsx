"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Heart, Minus, Plus, Sparkles, Shirt, Truck, RotateCcw, Banknote, Check } from "lucide-react";
import { useStore } from "../store-provider";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionItem } from "@/components/ui/accordion";
import { SizeGuide } from "./size-guide";
import { Stars } from "../home/reviews";
import { cn } from "@/lib/utils";
import { fmt } from "@/lib/i18n/format";
import { SIZE_ORDER } from "@/lib/catalog/sizes";

export type PdpVariant = { id: string; size: string; color: string; colorHex: string; stock: number; lowStockThreshold: number };

export type PdpProduct = {
  id: string;
  slug: string;
  name: string;
  teamName: string | null;
  categoryName: string;
  season: string | null;
  description: string;
  fabric: string | null;
  care: string | null;
  fit: string | null;
  price: number;
  original: number | null;
  percentOff: number;
  variants: PdpVariant[];
  tryOnEnabled: boolean;
  customizable: boolean;
  customizationPrice: number | null;
  rating: { avg: number; count: number };
};

export function PurchasePanel({ p, delivery }: { p: PdpProduct; delivery: { processing: string; returnDays: number; rates: { name: string; fee: number; eta: string }[]; freeThreshold: number | null } }) {
  const { t, money, addToCart, wishlist, toggleWishlist, pushRecentlyViewed } = useStore();
  const router = useRouter();
  const colors = React.useMemo(() => [...new Map(p.variants.map((v) => [v.color, v.colorHex])).entries()], [p.variants]);
  const [color, setColor] = React.useState(colors[0]?.[0] ?? "");
  const sizes = p.variants.filter((v) => v.color === color).sort((a, b) => SIZE_ORDER.indexOf(a.size) - SIZE_ORDER.indexOf(b.size));
  const [variantId, setVariantId] = React.useState<string | null>(null);
  const [qty, setQty] = React.useState(1);
  const [busy, setBusy] = React.useState<"add" | "buy" | null>(null);
  const [sizeError, setSizeError] = React.useState(false);
  const [added, setAdded] = React.useState(false);
  const selected = p.variants.find((v) => v.id === variantId) ?? null;
  const saved = wishlist.has(p.id);
  const ctaRef = React.useRef<HTMLDivElement>(null);
  const [showSticky, setShowSticky] = React.useState(false);

  React.useEffect(() => {
    pushRecentlyViewed(p.id);
    fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "product_view", productId: p.id }) }).catch(() => {});
  }, [p.id, pushRecentlyViewed]);

  React.useEffect(() => {
    const el = ctaRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setShowSticky(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const pickColor = (name: string) => {
    setColor(name);
    // Keep the same size in the new colour when it exists.
    if (selected) setVariantId(p.variants.find((v) => v.color === name && v.size === selected.size)?.id ?? null);
  };

  const go = async (mode: "add" | "buy") => {
    if (!selected) {
      setSizeError(true);
      document.getElementById("size-picker")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setBusy(mode);
    const ok = await addToCart(selected.id, qty, { productName: p.name, silent: mode === "buy" });
    setBusy(null);
    if (!ok) return;
    if (mode === "buy") router.push("/checkout");
    else {
      setAdded(true);
      setTimeout(() => setAdded(false), 1800);
    }
  };

  return (
    <div className="lg:sticky lg:top-28">
      <nav className="mb-4 text-[12px] text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/shop" className="hover:text-foreground">{t.nav.shop}</Link> <span className="mx-1">/</span> <span>{p.categoryName}</span>
      </nav>
      <p className="text-[13px] font-medium text-muted-foreground">{[p.teamName, p.season].filter(Boolean).join(" · ")}</p>
      <h1 className="mt-1 font-heading text-[28px] font-extrabold leading-[1.08] md:text-[36px]">{p.name}</h1>
      {p.rating.count > 0 && (
        <a href="#reviews" className="mt-2 inline-flex items-center gap-2 text-[13px]">
          <Stars value={Math.round(p.rating.avg)} /> <span className="text-muted-foreground">{p.rating.avg.toFixed(1)} · {p.rating.count} {t.product.reviews.toLowerCase()}</span>
        </a>
      )}
      <div className="mt-4 flex items-baseline gap-3">
        <span className={cn("text-[24px] font-bold tabular", p.original && "text-sale")}>{money(p.price)}</span>
        {p.original && <span className="text-[16px] text-muted-foreground line-through tabular">{money(p.original)}</span>}
        {p.percentOff > 0 && <span className="rounded-full bg-sale/10 px-2 py-0.5 text-[12px] font-semibold text-sale">−{p.percentOff}%</span>}
      </div>
      <p className="mt-1 text-[12px] text-muted-foreground">Inclusive of VAT · Cash on Delivery available</p>

      {colors.length > 1 && (
        <div className="mt-7">
          <p className="mb-3 text-sm font-medium">{t.product.color}: <span className="text-muted-foreground">{color}</span></p>
          <div className="flex gap-2.5">
            {colors.map(([name, hex]) => (
              <button key={name} onClick={() => pickColor(name)} aria-label={name} aria-pressed={color === name} className={cn("h-10 w-10 rounded-full border-2 p-0.5 transition", color === name ? "border-foreground" : "border-transparent hover:border-foreground/30")}>
                <span className="block h-full w-full rounded-full border border-black/10" style={{ background: hex }} />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-7" id="size-picker">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium">{t.product.size}{selected && <span className="text-muted-foreground">: {selected.size}</span>}</p>
          <SizeGuide label={t.product.sizeGuide} />
        </div>
        <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label={t.product.selectSize}>
          {sizes.map((v) => {
            const out = v.stock <= 0;
            return (
              <button
                key={v.id}
                role="radio"
                aria-checked={variantId === v.id}
                disabled={out}
                onClick={() => { setVariantId(v.id); setSizeError(false); setQty(1); }}
                className={cn(
                  "relative h-12 rounded-[calc(var(--radius)*0.6)] border text-sm font-semibold transition",
                  variantId === v.id ? "border-foreground bg-foreground text-background" : "border-border bg-surface hover:border-foreground",
                  out && "cursor-not-allowed text-muted-foreground/50 line-through hover:border-border",
                  sizeError && !variantId && "border-danger/60",
                )}
              >
                {v.size}
              </button>
            );
          })}
        </div>
        <AnimatePresence>
          {sizeError && !selected && (
            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-2 text-[13px] font-medium text-danger" role="alert">{t.product.selectSize}</motion.p>
          )}
        </AnimatePresence>
        {selected && (
          <p className={cn("mt-2 text-[13px] font-medium", selected.stock <= selected.lowStockThreshold ? "text-warning" : "text-success")}>
            {selected.stock <= selected.lowStockThreshold ? fmt(t.product.lowStock, { n: selected.stock }) : t.product.inStock}
          </p>
        )}
      </div>

      <div className="mt-7 flex items-center gap-3">
        <div className="inline-flex h-12 items-center rounded-full border border-border bg-surface" aria-label={t.product.quantity}>
          <button className="grid h-12 w-11 place-items-center disabled:opacity-30" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="Decrease quantity"><Minus className="h-4 w-4" /></button>
          <span className="w-6 text-center font-semibold tabular" aria-live="polite">{qty}</span>
          <button className="grid h-12 w-11 place-items-center disabled:opacity-30" onClick={() => setQty((q) => Math.min(selected ? Math.min(10, selected.stock) : 10, q + 1))} disabled={!!selected && qty >= Math.min(10, selected.stock)} aria-label="Increase quantity"><Plus className="h-4 w-4" /></button>
        </div>
        <button onClick={() => toggleWishlist(p.id, p.name)} aria-pressed={saved} className="inline-flex h-12 items-center gap-2 rounded-full border border-border bg-surface px-5 text-sm font-medium transition hover:border-foreground">
          <Heart className={cn("h-4 w-4", saved && "fill-sale text-sale")} /> {saved ? t.product.saved : t.product.saveWishlist}
        </button>
      </div>

      <div ref={ctaRef} className="mt-4 grid gap-3 sm:grid-cols-2">
        <Button size="lg" onClick={() => go("add")} loading={busy === "add"} className="h-[52px]">
          {added ? <><Check className="h-4 w-4" /> {t.product.added}</> : t.product.addToCart}
        </Button>
        <Button size="lg" variant="accent" onClick={() => go("buy")} loading={busy === "buy"} className="h-[52px]">{t.product.buyNow}</Button>
      </div>

      {(p.tryOnEnabled || p.customizable) && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {p.customizable && (
            <Link href={`/customize/${p.id}`} className="group flex items-center gap-3 rounded-[calc(var(--radius)*0.8)] border border-border bg-surface p-3.5 transition hover:border-foreground">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-muted"><Shirt className="h-5 w-5" /></span>
              <span className="text-sm">
                <span className="block font-semibold">{t.product.customize}</span>
                {p.customizationPrice != null && <span className="text-[12px] text-muted-foreground">+{money(p.customizationPrice)} · 3D preview</span>}
              </span>
            </Link>
          )}
          {p.tryOnEnabled && (
            <Link href={`/try-on?product=${p.slug}`} className="group flex items-center gap-3 rounded-[calc(var(--radius)*0.8)] border border-border bg-surface p-3.5 transition hover:border-foreground">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[#e5ebf2] text-[#0f1320]"><Sparkles className="h-5 w-5" /></span>
              <span className="text-sm">
                <span className="block font-semibold">{t.product.tryOn}</span>
                <span className="text-[12px] text-muted-foreground">AI-generated preview</span>
              </span>
            </Link>
          )}
        </div>
      )}

      <ul className="mt-7 space-y-2.5 rounded-[calc(var(--radius)*0.8)] bg-muted/60 p-4 text-[13px]">
        <li className="flex gap-2.5"><Truck className="h-4 w-4 shrink-0" /> {delivery.rates.map((r) => `${r.name} ${money(r.fee)} (${r.eta})`).join(" · ")}</li>
        {delivery.freeThreshold != null && <li className="flex gap-2.5"><Check className="h-4 w-4 shrink-0" /> Free delivery over {money(delivery.freeThreshold)}</li>}
        <li className="flex gap-2.5"><Banknote className="h-4 w-4 shrink-0" /> Cash on Delivery nationwide</li>
        <li className="flex gap-2.5"><RotateCcw className="h-4 w-4 shrink-0" /> {delivery.returnDays}-day size exchange (non-personalised)</li>
      </ul>

      <Accordion type="multiple" defaultValue={["details"]} className="mt-6">
        <AccordionItem value="details" title={t.product.details}>
          <p>{p.description}</p>
          {p.fit && <p className="mt-2"><strong className="font-medium text-foreground">Fit:</strong> {p.fit}</p>}
        </AccordionItem>
        {(p.fabric || p.care) && (
          <AccordionItem value="fabric" title={t.product.fabricCare}>
            {p.fabric && <p>{p.fabric}</p>}
            {p.care && <p className="mt-2">{p.care}</p>}
          </AccordionItem>
        )}
        <AccordionItem value="delivery" title={t.product.delivery}>
          <p>{delivery.processing}</p>
          <ul className="mt-2 list-disc pl-5">{delivery.rates.map((r) => <li key={r.name}>{r.name}: {money(r.fee)} · {r.eta}</li>)}</ul>
          <Link href="/shipping-policy" className="mt-2 inline-block underline">Shipping policy</Link>
        </AccordionItem>
        <AccordionItem value="returns" title={t.product.returns}>
          <p>Exchange unworn, non-personalised items within {delivery.returnDays} days of delivery. Personalised jerseys are made to order and can only be returned if faulty.</p>
          <Link href="/return-policy" className="mt-2 inline-block underline">Return policy</Link>
        </AccordionItem>
      </Accordion>

      {/* Mobile sticky purchase bar */}
      <AnimatePresence>
        {showSticky && (
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 380, damping: 38 }} className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 backdrop-blur lg:hidden">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium">{p.name}</p>
                <p className="text-[13px] font-bold tabular">{money(p.price)}{selected ? ` · ${selected.size}` : ""}</p>
              </div>
              <Button onClick={() => go("add")} loading={busy === "add"} className="h-11">{selected ? t.product.addToCart : t.product.selectSize}</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
