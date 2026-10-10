"use client";
import { imgSrc, imgSrcSet } from "@/lib/images";
import Link from "next/link";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useStore } from "../store-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function CartPageClient() {
  const { cart, t, money, updateItem, locale } = useStore();
  if (!cart)
    return (
      <div className="container-x py-12"><Skeleton className="h-10 w-48" /><Skeleton className="mt-8 h-40 w-full" /></div>
    );
  if (!cart.lines.length)
    return (
      <div className="container-x flex flex-col items-center py-28 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-muted"><ShoppingBag className="h-7 w-7" /></div>
        <h1 className="mt-6 font-heading text-3xl font-bold">{t.cart.empty}</h1>
        <Button asChild size="lg" className="mt-8"><Link href="/shop">{t.cart.continue}</Link></Button>
      </div>
    );
  return (
    <div className="container-x py-10 md:py-14">
      <h1 className="font-heading text-[34px] font-extrabold md:text-[48px]">{t.cart.title}</h1>
      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_380px]">
        <ul className="divide-y divide-border border-y border-border">
          {cart.lines.map((l) => (
            <li key={l.id} className="flex gap-5 py-6">
              <Link href={`/products/${l.slug}`} className="h-36 w-28 shrink-0 overflow-hidden rounded-[calc(var(--radius)*0.7)] bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {l.image && <img src={imgSrc(l.image, 320)} alt="" className="h-full w-full object-cover" />}
              </Link>
              <div className="flex flex-1 flex-col">
                <div className="flex justify-between gap-4">
                  <div>
                    <Link href={`/products/${l.slug}`} className="font-medium hover:underline">{locale === "bn" && l.nameBn ? l.nameBn : l.name}</Link>
                    <p className="mt-1 text-sm text-muted-foreground">{l.color} · {l.size} · {l.sku}</p>
                    {l.customization && (
                      <p className="mt-1 text-sm font-medium text-accent">{t.cart.personalised}: {l.customization.playerName} #{l.customization.playerNumber} · +{money(l.customizationMinor)}</p>
                    )}
                    {!l.available && <p className="mt-1 text-sm font-medium text-danger">Only {l.stock} available — reduce quantity to continue.</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold tabular">{money(l.lineTotalMinor)}</p>
                    {l.originalUnitMinor && <p className="text-sm text-muted-foreground line-through tabular">{money(l.originalUnitMinor * l.quantity)}</p>}
                  </div>
                </div>
                <div className="mt-auto flex items-center justify-between pt-4">
                  <div className="inline-flex items-center rounded-full border border-border">
                    <button className="grid h-9 w-9 place-items-center" onClick={() => updateItem(l.id, l.quantity - 1)} aria-label="Decrease quantity"><Minus className="h-3.5 w-3.5" /></button>
                    <span className="w-7 text-center text-sm tabular">{l.quantity}</span>
                    <button className="grid h-9 w-9 place-items-center disabled:opacity-30" disabled={l.quantity >= l.stock} onClick={() => updateItem(l.id, l.quantity + 1)} aria-label="Increase quantity"><Plus className="h-3.5 w-3.5" /></button>
                  </div>
                  <button onClick={() => updateItem(l.id, 0)} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><Trash2 className="h-4 w-4" /> {t.cart.remove}</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <aside className="h-fit rounded-[var(--radius)] border border-border bg-surface p-6 lg:sticky lg:top-28">
          <h2 className="font-heading text-lg font-bold">{t.checkout.summary}</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">{t.cart.subtotal}</dt><dd className="tabular">{money(cart.subtotalMinor)}</dd></div>
            {cart.customizationMinor > 0 && <div className="flex justify-between"><dt className="text-muted-foreground">{t.checkout.customization}</dt><dd className="tabular">{money(cart.customizationMinor)}</dd></div>}
            {cart.discountMinor > 0 && <div className="flex justify-between text-success"><dt>{t.checkout.discount}</dt><dd className="tabular">−{money(cart.discountMinor)}</dd></div>}
          </dl>
          <p className="mt-3 text-[12px] text-muted-foreground">{t.cart.shippingNote}</p>
          <Button asChild size="lg" block className="mt-5" disabled={cart.lines.some((l) => !l.available)}>
            <Link href="/checkout">{t.cart.checkout}</Link>
          </Button>
          <Link href="/shop" className="mt-4 block text-center text-sm underline underline-offset-4">{t.cart.continue}</Link>
        </aside>
      </div>
    </div>
  );
}
