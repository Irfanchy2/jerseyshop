"use client";

import { imgSrc, imgSrcSet } from "@/lib/images";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Banknote, CreditCard, Lock, Tag, AlertCircle, ShoppingBag } from "lucide-react";
import { useStore, api } from "../store-provider";
import type { PricedCart } from "@/lib/cart/server";
import { BD_DIVISIONS, DIVISIONS } from "@/lib/bd-locations";
import { normalizeBdPhone } from "@/lib/phone";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Addr = { name: string; phone: string; line1: string; area: string; district: string; division: string; postcode: string };

const IDEM_KEY = "js:checkout-key";

function newKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function CheckoutForm({
  user,
  savedAddress,
  payments,
  paymentNotice,
}: {
  user: { name: string; email: string; phone: string | null } | null;
  savedAddress: Addr | null;
  payments: { cod: boolean; online: boolean };
  paymentNotice: string | null;
}) {
  const { t, money, cart: ctxCart, refreshCart, locale } = useStore();
  const router = useRouter();
  const [form, setForm] = React.useState({
    name: savedAddress?.name ?? user?.name ?? "",
    phone: savedAddress?.phone ?? user?.phone ?? "",
    altPhone: "",
    email: user?.email ?? "",
    line1: savedAddress?.line1 ?? "",
    area: savedAddress?.area ?? "",
    division: savedAddress?.division ?? "Dhaka",
    district: savedAddress?.district ?? "Dhaka",
    postcode: savedAddress?.postcode ?? "",
    notes: "",
    paymentMethod: (payments.cod ? "COD" : "SSLCOMMERZ") as "COD" | "SSLCOMMERZ",
    marketingConsent: false,
  });
  const [priced, setPriced] = React.useState<PricedCart | null>(null);
  const [coupon, setCoupon] = React.useState("");
  const [couponBusy, setCouponBusy] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const keyRef = React.useRef<string>("");

  React.useEffect(() => {
    // Stable idempotency key per checkout attempt; survives refreshes so a double submit can't create two orders.
    try {
      keyRef.current = sessionStorage.getItem(IDEM_KEY) ?? newKey();
      sessionStorage.setItem(IDEM_KEY, keyRef.current);
    } catch {
      keyRef.current = newKey();
    }
    api("/api/track", { method: "POST", body: JSON.stringify({ name: "begin_checkout" }) }).catch(() => {});
  }, []);

  // Live, server-computed totals for the chosen district.
  React.useEffect(() => {
    let alive = true;
    api<PricedCart>(`/api/cart?district=${encodeURIComponent(form.district)}`).then((r) => alive && setPriced(r)).catch(() => {});
    return () => {
      alive = false;
    };
  }, [form.district, ctxCart]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  const applyCoupon = async (code: string | null) => {
    setCouponBusy(true);
    try {
      const r = await api<PricedCart>("/api/cart/coupon", { method: "POST", body: JSON.stringify({ code, district: form.district }) });
      setPriced(r);
      if (!code) setCoupon("");
    } catch (e) {
      setSubmitError((e as Error).message);
    } finally {
      setCouponBusy(false);
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 2) e.name = "Enter your full name";
    if (!normalizeBdPhone(form.phone)) e.phone = "Enter a valid mobile number, e.g. 01712345678";
    if (form.altPhone && !normalizeBdPhone(form.altPhone)) e.altPhone = "Enter a valid mobile number";
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Enter a valid email";
    if (form.line1.trim().length < 6) e.line1 = "Add house, road and area details";
    if (form.area.trim().length < 2) e.area = "Enter your area or thana";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (submitting) return;
    setSubmitError(null);
    if (!validate()) {
      document.querySelector("[aria-invalid=true]")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setSubmitting(true);
    try {
      const r = await api<{ orderNumber: string; redirect: string }>("/api/checkout", {
        method: "POST",
        body: JSON.stringify({ ...form, idempotencyKey: keyRef.current, couponCode: priced?.coupon?.valid ? priced.coupon.code : undefined }),
      });
      try {
        sessionStorage.removeItem(IDEM_KEY);
      } catch {}
      if (/^https?:\/\//.test(r.redirect)) window.location.href = r.redirect;
      else {
        await refreshCart();
        router.push(r.redirect);
      }
    } catch (e) {
      const err = e as Error & { data?: { issues?: { path: string; message: string }[] } };
      if (err.data?.issues) setErrors(Object.fromEntries(err.data.issues.map((i) => [i.path, i.message])));
      setSubmitError(err.message);
      setSubmitting(false);
      refreshCart();
    }
  };

  if (!priced) return <div className="container-x py-12"><Skeleton className="h-10 w-56" /><div className="mt-8 grid gap-8 lg:grid-cols-[1fr_420px]"><Skeleton className="h-[600px]" /><Skeleton className="h-80" /></div></div>;

  if (!priced.lines.length)
    return (
      <div className="container-x flex flex-col items-center py-28 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-muted"><ShoppingBag className="h-7 w-7" /></div>
        <h1 className="mt-6 font-heading text-3xl font-bold">{t.cart.empty}</h1>
        {paymentNotice && <p className="mt-4 max-w-md text-sm text-muted-foreground">{paymentNotice}</p>}
        <Button asChild size="lg" className="mt-8"><Link href="/shop">{t.cart.continue}</Link></Button>
      </div>
    );

  const districts = BD_DIVISIONS[form.division] ?? [];
  const unavailable = priced.lines.some((l) => !l.available);

  return (
    <form onSubmit={submit} noValidate className="container-x py-8 md:py-12">
      <h1 className="font-heading text-[32px] font-extrabold md:text-[44px]">{t.checkout.title}</h1>
      {paymentNotice && (
        <p className="mt-4 flex items-start gap-2 rounded-lg bg-warning/10 p-4 text-sm text-warning"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{paymentNotice}</p>
      )}
      {!user && (
        <p className="mt-3 text-sm text-muted-foreground">
          Checking out as a guest. <Link href="/account/login?next=/checkout" className="font-medium text-foreground underline underline-offset-4">Sign in</Link> for faster checkout and order history.
        </p>
      )}
      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_420px] lg:gap-14">
        <div className="space-y-10">
          <fieldset>
            <legend className="mb-5 font-heading text-xl font-bold">{t.checkout.contact}</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t.checkout.name} htmlFor="name" error={errors.name} className="sm:col-span-2">
                <Input id="name" autoComplete="name" value={form.name} onChange={(e) => set("name", e.target.value)} aria-invalid={!!errors.name} />
              </Field>
              <Field label={t.checkout.phone} htmlFor="phone" error={errors.phone} hint="We'll call to confirm before dispatch">
                <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="01XXXXXXXXX" value={form.phone} onChange={(e) => set("phone", e.target.value)} aria-invalid={!!errors.phone} />
              </Field>
              <Field label={t.checkout.altPhone} htmlFor="altPhone" error={errors.altPhone}>
                <Input id="altPhone" type="tel" inputMode="tel" value={form.altPhone} onChange={(e) => set("altPhone", e.target.value)} aria-invalid={!!errors.altPhone} />
              </Field>
              <Field label={t.checkout.email} htmlFor="email" error={errors.email} className="sm:col-span-2">
                <Input id="email" type="email" autoComplete="email" value={form.email} onChange={(e) => set("email", e.target.value)} aria-invalid={!!errors.email} />
              </Field>
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-5 font-heading text-xl font-bold">{t.checkout.delivery}</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t.checkout.division} htmlFor="division">
                <NativeSelect id="division" value={form.division} onChange={(e) => { const d = e.target.value; setForm((f) => ({ ...f, division: d, district: BD_DIVISIONS[d][0] })); }}>
                  {DIVISIONS.map((d) => <option key={d}>{d}</option>)}
                </NativeSelect>
              </Field>
              <Field label={t.checkout.district} htmlFor="district" error={errors.district}>
                <NativeSelect id="district" value={form.district} onChange={(e) => set("district", e.target.value)}>
                  {districts.map((d) => <option key={d}>{d}</option>)}
                </NativeSelect>
              </Field>
              <Field label={t.checkout.area} htmlFor="area" error={errors.area}>
                <Input id="area" autoComplete="address-level3" value={form.area} onChange={(e) => set("area", e.target.value)} aria-invalid={!!errors.area} placeholder="e.g. Dhanmondi" />
              </Field>
              <Field label={t.checkout.postcode} htmlFor="postcode">
                <Input id="postcode" inputMode="numeric" autoComplete="postal-code" value={form.postcode} onChange={(e) => set("postcode", e.target.value.replace(/\D/g, "").slice(0, 4))} />
              </Field>
              <Field label={t.checkout.address} htmlFor="line1" error={errors.line1} className="sm:col-span-2">
                <Textarea id="line1" autoComplete="street-address" rows={2} value={form.line1} onChange={(e) => set("line1", e.target.value)} aria-invalid={!!errors.line1} placeholder="House 12, Road 5, near …" />
              </Field>
              <Field label={t.checkout.notes} htmlFor="notes" className="sm:col-span-2">
                <Textarea id="notes" rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
              </Field>
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-5 font-heading text-xl font-bold">{t.checkout.shippingMethod}</legend>
            <div className="flex items-center justify-between rounded-[calc(var(--radius)*0.8)] border-2 border-foreground bg-surface p-4">
              <div>
                <p className="font-semibold">{locale === "bn" && priced.shipping.nameBn ? priced.shipping.nameBn : priced.shipping.name}</p>
                <p className="text-sm text-muted-foreground">{priced.shipping.etaText} · {form.district}</p>
              </div>
              <p className="font-semibold tabular">{priced.shipping.feeMinor === 0 ? t.checkout.free : money(priced.shipping.feeMinor)}</p>
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-5 font-heading text-xl font-bold">{t.checkout.payment}</legend>
            <div className="space-y-3" role="radiogroup">
              {payments.cod && (
                <PayOption checked={form.paymentMethod === "COD"} onSelect={() => set("paymentMethod", "COD")} icon={<Banknote className="h-5 w-5" />} title={t.checkout.cod} body={t.checkout.codBody} />
              )}
              {payments.online && (
                <PayOption checked={form.paymentMethod === "SSLCOMMERZ"} onSelect={() => set("paymentMethod", "SSLCOMMERZ")} icon={<CreditCard className="h-5 w-5" />} title={t.checkout.online} body="You'll be redirected to SSLCommerz to pay securely. Your order is confirmed after the payment is verified." />
              )}
              {!payments.cod && !payments.online && <p className="text-sm text-danger">No payment methods are currently available.</p>}
            </div>
          </fieldset>

          {user && (
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" checked={form.marketingConsent} onChange={(e) => set("marketingConsent", e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--accent)]" />
              <span className="text-muted-foreground">Email me about new kits and offers (optional).</span>
            </label>
          )}
        </div>

        <aside className="h-fit lg:sticky lg:top-28">
          <div className="rounded-[var(--radius)] border border-border bg-surface p-6">
            <h2 className="font-heading text-lg font-bold">{t.checkout.summary}</h2>
            <ul className="mt-5 max-h-80 space-y-4 overflow-y-auto pr-1">
              {priced.lines.map((l) => (
                <li key={l.id} className="flex gap-3">
                  <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {l.image && <img src={imgSrc(l.image, 320)} alt="" className="h-full w-full object-cover" />}
                    <span className="absolute -right-0 -top-0 grid h-5 min-w-5 place-items-center rounded-bl-md bg-foreground px-1 text-[10px] font-bold text-background">{l.quantity}</span>
                  </div>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="line-clamp-2 font-medium">{l.name}</p>
                    <p className="text-muted-foreground">{l.size} · {l.color}</p>
                    {l.customization && <p className="text-[12px] text-accent">{l.customization.playerName} #{l.customization.playerNumber}</p>}
                    {!l.available && <p className="text-[12px] text-danger">Not enough stock</p>}
                  </div>
                  <p className="text-sm font-medium tabular">{money(l.lineTotalMinor)}</p>
                </li>
              ))}
            </ul>

            <div className="mt-6 border-t border-border pt-5">
              {priced.coupon?.valid ? (
                <div className="flex items-center justify-between rounded-lg bg-success/10 px-3 py-2.5 text-sm text-success">
                  <span className="inline-flex items-center gap-2 font-semibold"><Tag className="h-4 w-4" /> {priced.coupon.code}</span>
                  <button type="button" onClick={() => applyCoupon(null)} className="text-[13px] underline">Remove</button>
                </div>
              ) : (
                <div>
                  <div className="flex gap-2">
                    <Input aria-label={t.checkout.coupon} placeholder={t.checkout.coupon} value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} className="uppercase" />
                    <Button type="button" variant="outline" onClick={() => coupon && applyCoupon(coupon)} loading={couponBusy} className="h-11">{t.checkout.applyCoupon}</Button>
                  </div>
                  {priced.coupon && !priced.coupon.valid && <p className="mt-2 text-[13px] text-danger" role="alert">{priced.coupon.message}</p>}
                </div>
              )}
            </div>

            <dl className="mt-5 space-y-2 border-t border-border pt-5 text-sm">
              <Row label={t.cart.subtotal} value={money(priced.subtotalMinor)} />
              {priced.customizationMinor > 0 && <Row label={t.checkout.customization} value={money(priced.customizationMinor)} />}
              {priced.bundleDiscountMinor > 0 && <Row label="Bundle saving" value={`−${money(priced.bundleDiscountMinor)}`} className="text-success" />}
              {priced.couponDiscountMinor > 0 && <Row label={t.checkout.discount} value={`−${money(priced.couponDiscountMinor)}`} className="text-success" />}
              <Row label={t.checkout.shipping} value={priced.shipping.feeMinor === 0 ? t.checkout.free : money(priced.shipping.feeMinor)} />
              <div className="flex justify-between border-t border-border pt-3 text-base font-bold">
                <dt>{t.checkout.total}</dt>
                <dd className="tabular">{money(priced.totalMinor)}</dd>
              </div>
            </dl>

            {submitError && <p className="mt-4 flex items-start gap-2 rounded-lg bg-danger/10 p-3 text-sm text-danger" role="alert"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{submitError}</p>}
            <Button type="submit" size="lg" block className="mt-5 h-[52px]" loading={submitting} disabled={unavailable || (!payments.cod && !payments.online)}>
              <Lock className="h-4 w-4" /> {t.checkout.placeOrder} · {money(priced.totalMinor)}
            </Button>
            <p className="mt-3 text-center text-[12px] text-muted-foreground">
              By placing your order you agree to our <Link href="/terms" className="underline">terms</Link> and <Link href="/return-policy" className="underline">return policy</Link>.
            </p>
          </div>
        </aside>
      </div>
    </form>
  );
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn("flex justify-between", className)}>
      <dt className={className ? undefined : "text-muted-foreground"}>{label}</dt>
      <dd className="tabular">{value}</dd>
    </div>
  );
}

function PayOption({ checked, onSelect, icon, title, body }: { checked: boolean; onSelect: () => void; icon: React.ReactNode; title: string; body: string }) {
  return (
    <button type="button" role="radio" aria-checked={checked} onClick={onSelect} className={cn("flex w-full items-start gap-4 rounded-[calc(var(--radius)*0.8)] border-2 bg-surface p-4 text-left transition", checked ? "border-foreground" : "border-border hover:border-foreground/40")}>
      <span className={cn("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2", checked ? "border-foreground" : "border-foreground/30")}>{checked && <span className="h-2.5 w-2.5 rounded-full bg-foreground" />}</span>
      <span className="flex-1">
        <span className="flex items-center gap-2 font-semibold">{icon}{title}</span>
        <span className="mt-1 block text-sm text-muted-foreground">{body}</span>
      </span>
    </button>
  );
}
