"use client";

import { imgSrc, imgSrcSet } from "@/lib/images";
import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Minus, Plus, ShoppingBag, Trash2, Truck } from "lucide-react";
import { useStore } from "./store-provider";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { fmt } from "@/lib/i18n/format";

export function CartDrawer() {
  const { cart, cartOpen, setCartOpen, t, money, updateItem, locale } = useStore();
  const [pending, setPending] = React.useState<string | null>(null);
  const lines = cart?.lines ?? [];
  const threshold = cart?.freeShippingThresholdMinor ?? null;
  const merch = cart ? cart.subtotalMinor - cart.discountMinor : 0;
  const remaining = threshold != null ? Math.max(0, threshold - merch) : null;
  const progress = threshold ? Math.min(100, (merch / threshold) * 100) : 0;

  const change = async (id: string, q: number) => {
    setPending(id);
    await updateItem(id, q);
    setPending(null);
  };

  return (
    <Sheet open={cartOpen} onOpenChange={setCartOpen}>
      <SheetContent side="right" title={t.cart.title}>
        <div className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-6">
          <h2 className="font-heading text-lg font-bold">{t.cart.title}</h2>
          {cart && cart.itemCount > 0 && <span className="text-sm text-muted-foreground">({cart.itemCount})</span>}
        </div>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 p-8 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-muted"><ShoppingBag className="h-7 w-7" /></div>
            <p className="text-muted-foreground">{t.cart.empty}</p>
            <Button asChild onClick={() => setCartOpen(false)}><Link href="/shop">{t.home.shopJerseys}</Link></Button>
          </div>
        ) : (
          <>
            {threshold != null && (
              <div className="border-b border-border px-6 py-4">
                <p className="flex items-center gap-2 text-[13px] font-medium">
                  <Truck className="h-4 w-4" />
                  {remaining && remaining > 0 ? fmt(t.cart.freeShippingProgress, { amount: money(remaining) }) : t.cart.freeShippingUnlocked}
                </p>
                <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-muted">
                  <motion.div className="h-full bg-accent" initial={false} animate={{ width: `${progress}%` }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} />
                </div>
              </div>
            )}
            <ul className="flex-1 divide-y divide-border overflow-y-auto px-6">
              <AnimatePresence initial={false}>
                {lines.map((l) => (
                  <motion.li key={l.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }} className="flex gap-4 py-5">
                    <Link href={`/products/${l.slug}`} onClick={() => setCartOpen(false)} className="h-28 w-[88px] shrink-0 overflow-hidden rounded-[calc(var(--radius)*0.7)] bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {l.image && <img src={imgSrc(l.image, 320)} alt="" className="h-full w-full object-cover" />}
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex justify-between gap-3">
                        <Link href={`/products/${l.slug}`} onClick={() => setCartOpen(false)} className="line-clamp-2 text-sm font-medium leading-snug">
                          {locale === "bn" && l.nameBn ? l.nameBn : l.name}
                        </Link>
                        <p className="shrink-0 text-sm font-semibold tabular">{money(l.lineTotalMinor)}</p>
                      </div>
                      <p className="mt-1 text-[13px] text-muted-foreground">{l.color} · {l.size}</p>
                      {l.customization && (
                        <p className="mt-1 text-[12px] font-medium text-accent">
                          {t.cart.personalised}: {l.customization.playerName} #{l.customization.playerNumber} (+{money(l.customizationMinor)})
                        </p>
                      )}
                      {!l.available && <p className="mt-1 text-[12px] font-medium text-danger">{l.stock > 0 ? `Only ${l.stock} left` : t.product.outOfStock}</p>}
                      <div className="mt-auto flex items-center justify-between pt-3">
                        <div className="inline-flex items-center rounded-full border border-border" aria-busy={pending === l.id}>
                          <button className="grid h-8 w-8 place-items-center disabled:opacity-40" onClick={() => change(l.id, l.quantity - 1)} disabled={pending === l.id} aria-label="Decrease quantity">
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-6 text-center text-sm tabular" aria-live="polite">{l.quantity}</span>
                          <button className="grid h-8 w-8 place-items-center disabled:opacity-40" onClick={() => change(l.id, l.quantity + 1)} disabled={pending === l.id || l.quantity >= l.stock} aria-label="Increase quantity">
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <button className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground" onClick={() => change(l.id, 0)}>
                          <Trash2 className="h-3.5 w-3.5" /> {t.cart.remove}
                        </button>
                      </div>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
            <div className="shrink-0 border-t border-border bg-surface px-6 pb-6 pt-4">
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">{t.cart.subtotal}</dt><dd className="tabular">{money((cart?.subtotalMinor ?? 0) + (cart?.customizationMinor ?? 0))}</dd></div>
                {(cart?.discountMinor ?? 0) > 0 && <div className="flex justify-between text-success"><dt>{t.checkout.discount}</dt><dd className="tabular">−{money(cart!.discountMinor)}</dd></div>}
              </dl>
              <p className="mt-2 text-[12px] text-muted-foreground">{t.cart.shippingNote}</p>
              <Button asChild size="lg" block className="mt-4" onClick={() => setCartOpen(false)}>
                <Link href="/checkout">{t.cart.checkout} · {money((cart?.subtotalMinor ?? 0) + (cart?.customizationMinor ?? 0) - (cart?.discountMinor ?? 0))}</Link>
              </Button>
              <Button asChild variant="link" block className="mt-2 text-[13px]" onClick={() => setCartOpen(false)}>
                <Link href="/cart">View bag</Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
