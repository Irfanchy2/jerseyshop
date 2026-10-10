"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RotateCcw, Save, ShoppingBag, Type, Hash, Palette, Check, Box } from "lucide-react";
import { useStore, api } from "@/components/store/store-provider";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { validatePersonalisation, FONT_LABELS } from "@/lib/customizer";
import type { JerseyDesign } from "@/lib/jersey-art";
import type { Area } from "./textures";

const Jersey3D = dynamic(() => import("./jersey-3d").then((m) => m.Jersey3DViewer), { ssr: false, loading: () => <div className="skeleton h-full w-full" /> });

type Props = {
  signedIn: boolean;
  product: {
    id: string; slug: string; name: string; price: number; design: JerseyDesign; modelUrl: string | null; allowBaseColor: boolean;
    colors: { name: string; hex: string }[];
    variants: { id: string; size: string; color: string; stock: number }[];
  };
  template: { priceMinor: number; maxNameLength: number; maxNumberDigits: number; allowedFonts: string[]; allowedColors: string[]; nameArea: Area; numberArea: Area; frontNumberArea: Area | null };
  initial: { name: string; number: string; font: string; textColor: string; baseColor: string | null } | null;
};

export function CustomizerStudio({ signedIn, product, template, initial }: Props) {
  const { money, addToCart, t } = useStore();
  const router = useRouter();
  const defaults = React.useMemo(
    () => ({
      name: "",
      number: "",
      font: template.allowedFonts[0] ?? "block",
      textColor: template.allowedColors.find((c) => c.toLowerCase() !== product.design.base.toLowerCase()) ?? "#ffffff",
      baseColor: null as string | null,
      colorName: product.colors[0]?.name ?? "",
    }),
    [template, product],
  );
  const [state, setState] = React.useState(() => ({ ...defaults, ...(initial ? { name: initial.name, number: initial.number, font: initial.font, textColor: initial.textColor, baseColor: initial.baseColor } : {}) }));
  const [view, setView] = React.useState<"front" | "back">("back");
  const [size, setSize] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<"save" | "cart" | null>(null);

  React.useEffect(() => {
    api("/api/track", { method: "POST", body: JSON.stringify({ name: "customizer_open", productId: product.id }) }).catch(() => {});
  }, [product.id]);

  // When the product has multiple colourways (custom team kits), the colourway drives the base colour.
  const colorway = product.colors.find((c) => c.name === state.colorName);
  const design: JerseyDesign = { ...product.design, base: state.baseColor ?? (product.allowBaseColor && colorway ? colorway.hex : product.design.base) };
  const problem = validatePersonalisation({ playerName: state.name, playerNumber: state.number, font: state.font, textColor: state.textColor, baseColor: null }, template, product.allowBaseColor);
  const variants = product.variants.filter((v) => v.color === (state.colorName || product.colors[0]?.name));
  const variant = variants.find((v) => v.size === size) ?? null;

  const createDesign = async (save: boolean) =>
    api<{ id: string }>("/api/designs", {
      method: "POST",
      body: JSON.stringify({ productId: product.id, playerName: state.name, playerNumber: state.number, font: state.font, textColor: state.textColor, baseColor: product.allowBaseColor ? design.base : null, save }),
    });

  const save = async () => {
    if (!signedIn) return router.push(`/account/login?next=/customize/${product.id}`);
    if (problem) return toast({ title: problem, tone: "error" });
    setBusy("save");
    try {
      await createDesign(true);
      toast({ title: "Design saved", action: { label: "View", href: "/account/designs" } });
    } catch (e) {
      toast({ title: (e as Error).message, tone: "error" });
    } finally {
      setBusy(null);
    }
  };

  const addCart = async () => {
    if (problem) return toast({ title: problem, tone: "error" });
    if (!variant) return toast({ title: t.product.selectSize, tone: "error" });
    setBusy("cart");
    try {
      const d = await createDesign(false);
      await addToCart(variant.id, 1, { customDesignId: d.id, productName: product.name });
    } catch (e) {
      toast({ title: (e as Error).message, tone: "error" });
    } finally {
      setBusy(null);
    }
  };

  const personalisation = { name: state.name, number: state.number, font: state.font, textColor: state.textColor, nameArea: template.nameArea, numberArea: template.numberArea, frontNumberArea: template.frontNumberArea };

  return (
    <div className="container-x pb-16 pt-6 md:pt-10">
      <nav className="mb-4 text-[12px] text-muted-foreground"><Link href={`/products/${product.slug}`} className="hover:text-foreground">← {product.name}</Link></nav>
      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <div className="relative overflow-hidden rounded-[var(--radius)] bg-[radial-gradient(70%_60%_at_50%_40%,#ffffff,#e6e3dc)]" style={{ minHeight: "min(78vh, 760px)" }}>
          <div className="absolute inset-0">
            <Jersey3D design={design} personalisation={personalisation} view={view} modelUrl={product.modelUrl} />
          </div>
          <div className="absolute left-4 top-4 flex gap-1 rounded-full bg-white/90 p-1 text-[13px] font-semibold shadow-sm">
            {(["front", "back"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} aria-pressed={view === v} className={cn("rounded-full px-4 py-1.5 capitalize", view === v ? "bg-black text-white" : "text-black/70")}>{v}</button>
            ))}
          </div>
          <p className="pointer-events-none absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-[12px] text-white"><Box className="h-3.5 w-3.5" /> Drag to rotate 360° · pinch or scroll to zoom</p>
        </div>

        <aside className="space-y-6 rounded-[var(--radius)] border border-border bg-surface p-6 lg:sticky lg:top-24 lg:h-fit">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Personalise</p>
            <h1 className="mt-1 font-heading text-2xl font-extrabold leading-tight">{product.name}</h1>
            <p className="mt-2 text-sm"><span className="font-semibold tabular">{money(product.price)}</span> <span className="text-muted-foreground">+ {money(template.priceMinor)} personalisation</span></p>
          </div>

          <div className="grid grid-cols-[1fr_96px] gap-3">
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-[13px] font-medium"><Type className="h-3.5 w-3.5" /> Name <span className="ml-auto text-muted-foreground tabular">{state.name.length}/{template.maxNameLength}</span></span>
              <input value={state.name} maxLength={template.maxNameLength} onChange={(e) => { setState((s) => ({ ...s, name: e.target.value.toUpperCase() })); setView("back"); }} className="h-11 w-full rounded-lg border border-border bg-background px-3 font-semibold uppercase tracking-wider outline-none focus:border-foreground" placeholder="YOUR NAME" aria-invalid={!!problem && problem.startsWith("Name")} />
            </label>
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-[13px] font-medium"><Hash className="h-3.5 w-3.5" /> No.</span>
              <input value={state.number} inputMode="numeric" onChange={(e) => { setState((s) => ({ ...s, number: e.target.value.replace(/\D/g, "").slice(0, template.maxNumberDigits) })); setView("back"); }} className="h-11 w-full rounded-lg border border-border bg-background px-3 text-center font-semibold outline-none focus:border-foreground" placeholder="10" />
            </label>
          </div>
          {problem && (state.name || state.number) && <p className="-mt-3 text-[13px] text-danger" role="alert">{problem}</p>}

          <div>
            <p className="mb-2 text-[13px] font-medium">Font</p>
            <div className="grid grid-cols-3 gap-2">
              {template.allowedFonts.map((f) => (
                <button key={f} onClick={() => setState((s) => ({ ...s, font: f }))} aria-pressed={state.font === f} className={cn("h-11 rounded-lg border text-sm font-semibold", state.font === f ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground")} style={{ fontFamily: f === "block" ? "var(--font-oswald)" : f === "classic" ? "var(--font-archivo)" : "var(--font-manrope)" }}>
                  {FONT_LABELS[f] ?? f}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 flex items-center gap-1.5 text-[13px] font-medium"><Palette className="h-3.5 w-3.5" /> Print colour</p>
            <div className="flex flex-wrap gap-2">
              {template.allowedColors.map((c) => (
                <button key={c} onClick={() => setState((s) => ({ ...s, textColor: c }))} aria-label={`Print colour ${c}`} aria-pressed={state.textColor === c} className={cn("grid h-9 w-9 place-items-center rounded-full border-2 transition", state.textColor === c ? "border-foreground" : "border-transparent")}>
                  <span className="grid h-7 w-7 place-items-center rounded-full border border-black/10" style={{ background: c }}>{state.textColor === c && <Check className="h-3.5 w-3.5" style={{ color: c.toLowerCase() === "#ffffff" ? "#000" : "#fff" }} />}</span>
                </button>
              ))}
            </div>
          </div>

          {product.allowBaseColor && product.colors.length > 1 && (
            <div>
              <p className="mb-2 text-[13px] font-medium">Shirt colour: <span className="text-muted-foreground">{state.colorName}</span></p>
              <div className="flex flex-wrap gap-2">
                {product.colors.map((c) => (
                  <button key={c.name} onClick={() => { setState((s) => ({ ...s, colorName: c.name, baseColor: null })); setSize(null); }} aria-label={c.name} aria-pressed={state.colorName === c.name} className={cn("h-9 w-9 rounded-full border-2 p-0.5", state.colorName === c.name ? "border-foreground" : "border-transparent")}>
                    <span className="block h-full w-full rounded-full border border-black/10" style={{ background: c.hex }} />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="mb-2 text-[13px] font-medium">{t.product.size}</p>
            <div className="grid grid-cols-5 gap-1.5">
              {variants.map((v) => (
                <button key={v.id} disabled={v.stock <= 0} onClick={() => setSize(v.size)} aria-pressed={size === v.size} className={cn("h-10 rounded-md border text-[13px] font-semibold", size === v.size ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground", v.stock <= 0 && "text-muted-foreground/50 line-through")}>{v.size}</button>
              ))}
            </div>
          </div>

          <div className="space-y-2 border-t border-border pt-5">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Jersey</span><span className="tabular">{money(product.price)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Name &amp; number</span><span className="tabular">{money(template.priceMinor)}</span></div>
            <div className="flex justify-between font-bold"><span>Total</span><span className="tabular">{money(product.price + template.priceMinor)}</span></div>
          </div>
          <Button block size="lg" onClick={addCart} loading={busy === "cart"} disabled={!!problem}><ShoppingBag className="h-4 w-4" /> Add personalised jersey</Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={save} loading={busy === "save"}><Save className="h-4 w-4" /> Save design</Button>
            <Button variant="ghost" onClick={() => { setState(defaults); setView("back"); }}><RotateCcw className="h-4 w-4" /> Reset</Button>
          </div>
          <p className="text-[12px] text-muted-foreground">Personalised jerseys are printed to order (48h) and can only be returned if faulty. Preview colours may vary slightly from the final print.</p>
        </aside>
      </div>
    </div>
  );
}
