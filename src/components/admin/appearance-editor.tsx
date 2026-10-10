"use client";

import * as React from "react";
import { Eye, Rocket, Heart } from "lucide-react";
import { saveSettingAction, publishSettingDraftAction } from "@/lib/admin/settings-actions";
import type { Settings } from "@/lib/settings";
import { useAction } from "./use-action";
import { Button } from "@/components/ui/button";
import { Field, NativeSelect } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type A = Settings["appearance"];
const COLOR_LABELS: Record<keyof A["colors"], string> = { background: "Page background", surface: "Cards & panels", muted: "Muted fill", foreground: "Text", mutedForeground: "Secondary text", border: "Borders", accent: "Accent (brand)", accentForeground: "Text on accent", sale: "Sale / price highlight" };
const RADIUS = { none: "0px", sm: "0.375rem", md: "0.75rem", lg: "1.25rem", full: "1.5rem" };

function contrast(a: string, b: string) {
  const l = (hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    const [r, g, bl] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [l(a), l(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

export function AppearanceEditor({ draft, presets, hasDraft }: { draft: A; presets: Record<string, A["colors"]>; hasDraft: boolean }) {
  const [a, setA] = React.useState(draft);
  const save = useAction(saveSettingAction<"appearance">);
  const publish = useAction(publishSettingDraftAction);
  const set = <K extends keyof A>(k: K, v: A[K]) => setA((x) => ({ ...x, [k]: v }));
  const c = a.colors;
  const checks = [
    { label: "Text on background", r: contrast(c.foreground, c.background), min: 4.5 },
    { label: "Secondary text on background", r: contrast(c.mutedForeground, c.background), min: 4.5 },
    { label: "Text on accent buttons", r: contrast(c.accentForeground, c.accent), min: 4.5 },
  ];
  const vars = {
    "--p-bg": c.background, "--p-surface": c.surface, "--p-muted": c.muted, "--p-fg": c.foreground, "--p-mfg": c.mutedForeground, "--p-border": c.border, "--p-accent": c.accent, "--p-afg": c.accentForeground, "--p-sale": c.sale,
    "--p-radius": RADIUS[a.radius], "--p-btn": a.buttonStyle === "sharp" ? "0px" : "999px",
    "--p-font": a.headingFont === "oswald" ? "var(--font-oswald)" : a.headingFont === "archivo" ? "var(--font-archivo)" : a.headingFont === "inter" ? "var(--font-inter)" : "var(--font-manrope)",
  } as React.CSSProperties;
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_440px]">
      <div className="space-y-6">
        <section className="rounded-xl border border-border bg-surface p-5">
          <p className="mb-3 font-medium">Presets</p>
          <div className="grid gap-3 sm:grid-cols-4">
            {Object.entries(presets).map(([name, p]) => (
              <button key={name} type="button" onClick={() => setA({ ...a, preset: name, colors: p })} className={cn("rounded-lg border p-3 text-left transition", a.preset === name ? "border-foreground ring-1 ring-foreground" : "border-border hover:border-foreground/40")}>
                <div className="flex gap-1">{[p.background, p.foreground, p.accent, p.sale].map((x, i) => <span key={i} className="h-6 w-6 rounded-full border border-black/10" style={{ background: x }} />)}</div>
                <p className="mt-2 text-[13px] font-medium capitalize">{name.replace(/-/g, " ")}</p>
              </button>
            ))}
          </div>
        </section>
        <section className="rounded-xl border border-border bg-surface p-5">
          <p className="mb-3 font-medium">Colours</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {(Object.keys(COLOR_LABELS) as (keyof A["colors"])[]).map((k) => (
              <label key={k} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-[13px]">
                <span>{COLOR_LABELS[k]}<span className="block font-mono text-[11px] text-muted-foreground">{c[k]}</span></span>
                <input type="color" value={c[k]} onChange={(e) => setA({ ...a, preset: "custom", colors: { ...c, [k]: e.target.value } })} className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent" aria-label={COLOR_LABELS[k]} />
              </label>
            ))}
          </div>
          <ul className="mt-4 space-y-1 text-[12px]">
            {checks.map((ch) => <li key={ch.label} className={ch.r >= ch.min ? "text-emerald-600" : "text-red-600"}>{ch.r >= ch.min ? "✓" : "✗"} {ch.label}: contrast {ch.r.toFixed(1)}:1 {ch.r < ch.min && `(needs ${ch.min}:1 for WCAG AA)`}</li>)}
          </ul>
        </section>
        <section className="grid gap-4 rounded-xl border border-border bg-surface p-5 sm:grid-cols-2">
          <Field label="Heading font" htmlFor="hf"><NativeSelect id="hf" value={a.headingFont} onChange={(e) => set("headingFont", e.target.value as A["headingFont"])}><option value="manrope">Manrope</option><option value="inter">Inter</option><option value="archivo">Archivo</option><option value="oswald">Oswald (condensed)</option></NativeSelect></Field>
          <Field label="Body font" htmlFor="bf"><NativeSelect id="bf" value={a.bodyFont} onChange={(e) => set("bodyFont", e.target.value as A["bodyFont"])}><option value="inter">Inter</option><option value="manrope">Manrope</option></NativeSelect></Field>
          <Field label="Heading case" htmlFor="hc"><NativeSelect id="hc" value={a.headingCase} onChange={(e) => set("headingCase", e.target.value as A["headingCase"])}><option value="normal">Normal</option><option value="uppercase">UPPERCASE</option></NativeSelect></Field>
          <Field label="Corner radius" htmlFor="rad"><NativeSelect id="rad" value={a.radius} onChange={(e) => set("radius", e.target.value as A["radius"])}>{Object.keys(RADIUS).map((r) => <option key={r}>{r}</option>)}</NativeSelect></Field>
          <Field label="Buttons" htmlFor="bs"><NativeSelect id="bs" value={a.buttonStyle} onChange={(e) => set("buttonStyle", e.target.value as A["buttonStyle"])}><option value="solid">Solid pill</option><option value="outline-pill">Outline pill</option><option value="sharp">Sharp</option></NativeSelect></Field>
          <Field label="Product card image" htmlFor="cr"><NativeSelect id="cr" value={a.cardImageRatio} onChange={(e) => set("cardImageRatio", e.target.value as A["cardImageRatio"])}><option value="4/5">Portrait 4:5</option><option value="3/4">Portrait 3:4</option><option value="1/1">Square</option></NativeSelect></Field>
          <Field label="Card style" htmlFor="cs"><NativeSelect id="cs" value={a.cardStyle} onChange={(e) => set("cardStyle", e.target.value as A["cardStyle"])}><option value="minimal">Minimal</option><option value="framed">Framed</option><option value="elevated">Elevated</option></NativeSelect></Field>
          <Field label="Section spacing" htmlFor="ss"><NativeSelect id="ss" value={a.sectionSpacing} onChange={(e) => set("sectionSpacing", e.target.value as A["sectionSpacing"])}><option value="compact">Compact</option><option value="comfortable">Comfortable</option><option value="airy">Airy</option></NativeSelect></Field>
        </section>
      </div>
      <div className="space-y-3 xl:sticky xl:top-20 xl:h-fit">
        <div className="overflow-hidden rounded-xl border border-border" style={vars}>
          <div className="p-5" style={{ background: "var(--p-bg)", color: "var(--p-fg)" }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--p-mfg)" }}>Live preview</p>
            <h3 className="mt-2 text-2xl font-extrabold" style={{ fontFamily: "var(--p-font)", textTransform: a.headingCase === "uppercase" ? "uppercase" : "none" }}>Wear the game you love.</h3>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[0, 1].map((i) => (
                <div key={i} className={cn(a.cardStyle === "framed" && "border p-2", a.cardStyle === "elevated" && "p-2 shadow-lg")} style={{ borderColor: "var(--p-border)", background: a.cardStyle === "minimal" ? "transparent" : "var(--p-surface)", borderRadius: "var(--p-radius)" }}>
                  <div className="relative" style={{ aspectRatio: a.cardImageRatio, background: "var(--p-muted)", borderRadius: "var(--p-radius)" }}>
                    {i === 1 && <span className="absolute left-2 top-2 rounded-full px-1.5 text-[10px] font-semibold text-white" style={{ background: "var(--p-sale)" }}>−15%</span>}
                    <Heart className="absolute right-2 top-2 h-4 w-4" />
                  </div>
                  <p className="mt-2 text-[12px] font-medium">Home Jersey 26/27</p>
                  <p className="text-[12px] font-semibold" style={{ color: i === 1 ? "var(--p-sale)" : undefined }}>৳1,890</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <span className={cn("px-4 py-2 text-[13px] font-medium", a.buttonStyle === "outline-pill" ? "border" : "")} style={{ background: a.buttonStyle === "outline-pill" ? "transparent" : "var(--p-fg)", color: a.buttonStyle === "outline-pill" ? "var(--p-fg)" : "var(--p-bg)", borderColor: "var(--p-fg)", borderRadius: "var(--p-btn)" }}>Add to bag</span>
              <span className="px-4 py-2 text-[13px] font-medium" style={{ background: "var(--p-accent)", color: "var(--p-afg)", borderRadius: "var(--p-btn)" }}>Buy now</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" loading={save.pending} onClick={() => save.run("appearance", a, { draft: true })}>Save draft</Button>
          <Button variant="outline" size="sm" onClick={async () => { const r = await save.run("appearance", a, { draft: true }); if (r.ok) window.open("/api/admin/preview?on=1", "_blank"); }}><Eye className="h-4 w-4" /> Preview on store</Button>
          <Button size="sm" loading={publish.pending || save.pending} onClick={async () => { const r = await save.run("appearance", a, { draft: true }); if (r.ok) await publish.run("appearance"); }}><Rocket className="h-4 w-4" /> Publish</Button>
        </div>
        <p className="text-[12px] text-muted-foreground">{hasDraft ? "An unpublished draft exists." : "The live store uses the published appearance."} Only validated design tokens are applied — no custom CSS.</p>
      </div>
    </div>
  );
}
