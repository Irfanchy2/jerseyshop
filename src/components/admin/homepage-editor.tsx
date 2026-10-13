"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, ChevronDown, Eye, Plus, Trash2, Upload, Rocket } from "lucide-react";
import { addHomepageSectionAction, deleteHomepageSectionAction, publishHomepageAction, saveHomepageDraftAction } from "@/lib/admin/cms-actions";
import { saveSettingAction } from "@/lib/admin/settings-actions";
import { SECTION_LABELS, type SectionType } from "@/lib/cms/sections";
import type { Settings } from "@/lib/settings";
import { useAction } from "./use-action";
import { useUpload } from "./product-form";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type Section = { id: string; type: SectionType; enabled: boolean; content: Record<string, unknown>; published: boolean };

const ENUMS: Record<string, string[]> = { tone: ["dark", "light"], source: ["best", "new", "featured", "collection", "manual"], align: ["left", "center"] };
const humanize = (k: string) => k.replace(/Bn$/, " (Bangla)").replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()).replace("Href", "link").replace("Url", " URL").replace("Cta", "Button");

function ImageField({ value, onChange, label }: { value: string | null; onChange: (v: string | null) => void; label: string }) {
  const up = useUpload("homepage");
  return (
    <Field label={label} htmlFor={label}>
      <div className="flex gap-2">
        <Input id={label} value={value ?? ""} onChange={(e) => onChange(e.target.value || null)} placeholder="Optional" />
        <label className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-border px-2.5 text-[13px] hover:bg-muted"><Upload className="h-3.5 w-3.5" />{up.busy ? "…" : "Upload"}<input type="file" accept="image/*" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const url = await up.upload(f); if (url) onChange(url); } }} /></label>
      </div>
    </Field>
  );
}

/** Generic, schema-shaped editor: renders inputs from the section's content object. */
function ContentEditor({ value, onChange, products, collections }: { value: Record<string, unknown>; onChange: (v: Record<string, unknown>) => void; products: { slug: string; name: string }[]; collections: { slug: string; name: string }[] }) {
  const set = (k: string, v: unknown) => onChange({ ...value, [k]: v });
  const keys = Object.keys(value);
  if (!keys.length) return <p className="text-sm text-muted-foreground">This section has no settings — it shows live data automatically.</p>;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {keys.map((k) => {
        const v = value[k];
        const label = humanize(k);
        if (ENUMS[k]) return <Field key={k} label={label} htmlFor={k}><NativeSelect id={k} value={String(v)} onChange={(e) => set(k, e.target.value)}>{ENUMS[k].map((o) => <option key={o}>{o}</option>)}</NativeSelect></Field>;
        if (/color$/i.test(k)) return <Field key={k} label={label} htmlFor={k}><div className="flex gap-2"><input type="color" aria-label={label} value={String(v)} onChange={(e) => set(k, e.target.value)} className="h-11 w-12 rounded border border-border" /><Input id={k} value={String(v)} onChange={(e) => set(k, e.target.value)} /></div></Field>;
        if (/(imageUrl|videoUrl)$/.test(k)) return <ImageField key={k} label={label} value={(v as string) ?? null} onChange={(nv) => set(k, nv)} />;
        if (k === "productSlug") return <Field key={k} label="Product" htmlFor={k}><NativeSelect id={k} value={(v as string) ?? ""} onChange={(e) => set(k, e.target.value || null)}><option value="">None</option>{products.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}</NativeSelect></Field>;
        if (k === "collectionSlug") return <Field key={k} label="Collection" htmlFor={k}><NativeSelect id={k} value={(v as string) ?? ""} onChange={(e) => set(k, e.target.value || null)}><option value="">None</option>{collections.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}</NativeSelect></Field>;
        if ((k === "productSlugs" || k === "featuredProductSlugs" || k === "collectionSlugs") && Array.isArray(v)) {
          const opts = k === "collectionSlugs" ? collections : products;
          return (
            <Field key={k} label={label} htmlFor={k} className="sm:col-span-2" hint="Order follows selection order">
              <div className="flex flex-wrap gap-1.5 rounded-lg border border-border p-2">
                {(v as string[]).map((s) => <button type="button" key={s} onClick={() => set(k, (v as string[]).filter((x) => x !== s))} className="rounded-full bg-foreground px-2.5 py-1 text-[12px] text-background">{opts.find((o) => o.slug === s)?.name ?? s} ×</button>)}
                <select aria-label={`Add to ${label}`} value="" onChange={(e) => e.target.value && set(k, [...(v as string[]), e.target.value])} className="h-7 rounded border border-border bg-surface px-2 text-[12px]">
                  <option value="">+ Add…</option>{opts.filter((o) => !(v as string[]).includes(o.slug)).map((o) => <option key={o.slug} value={o.slug}>{o.name}</option>)}
                </select>
              </div>
            </Field>
          );
        }
        if (Array.isArray(v) && v.every((x) => typeof x === "object")) {
          return (
            <div key={k} className="space-y-2 sm:col-span-2">
              <p className="text-[13px] font-medium">{label}</p>
              {(v as Record<string, unknown>[]).map((item, i) => (
                <div key={i} className="rounded-lg border border-border p-3">
                  <div className="mb-2 flex justify-between text-[12px] text-muted-foreground"><span>Item {i + 1}</span><button type="button" onClick={() => set(k, (v as unknown[]).filter((_, j) => j !== i))}>Remove</button></div>
                  <ContentEditor value={item} products={products} collections={collections} onChange={(nv) => set(k, (v as unknown[]).map((x, j) => (j === i ? nv : x)))} />
                </div>
              ))}
              {v.length > 0 && <Button type="button" size="sm" variant="ghost" onClick={() => set(k, [...(v as unknown[]), { ...(v[0] as object) }])}><Plus className="h-4 w-4" /> Add item</Button>}
            </div>
          );
        }
        if (typeof v === "number") return <Field key={k} label={label} htmlFor={k}><Input id={k} inputMode="numeric" value={v} onChange={(e) => set(k, Number(e.target.value) || 0)} /></Field>;
        if (typeof v === "boolean") return <label key={k} className="flex items-center gap-2 text-sm"><Switch checked={v} onCheckedChange={(c) => set(k, c)} />{label}</label>;
        const long = /(sub|body|description)/i.test(k);
        return (
          <Field key={k} label={label} htmlFor={k} className={long ? "sm:col-span-2" : undefined}>
            {long ? <Textarea id={k} rows={2} value={(v as string) ?? ""} onChange={(e) => set(k, e.target.value)} /> : <Input id={k} value={(v as string) ?? ""} onChange={(e) => set(k, e.target.value)} />}
          </Field>
        );
      })}
    </div>
  );
}

export function HomepageEditor({ initial, products, collections, dirtyFromPublished }: { initial: Section[]; products: { slug: string; name: string }[]; collections: { slug: string; name: string }[]; dirtyFromPublished: boolean }) {
  const [sections, setSections] = React.useState(initial);
  const [open, setOpen] = React.useState<string | null>(null);
  const [dirty, setDirty] = React.useState(false);
  const save = useAction(saveHomepageDraftAction);
  const publish = useAction(publishHomepageAction);
  const add = useAction(addHomepageSectionAction);
  const del = useAction(deleteHomepageSectionAction);
  const update = (id: string, patch: Partial<Section>) => {
    setSections((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    setDirty(true);
  };
  const move = (i: number, d: -1 | 1) => {
    setSections((s) => {
      const a = [...s];
      [a[i], a[i + d]] = [a[i + d], a[i]];
      return a;
    });
    setDirty(true);
  };
  const saveDraft = async () => {
    const r = await save.run(sections.map((s) => ({ id: s.id, enabled: s.enabled, content: s.content })));
    if (r.ok) setDirty(false);
    return r;
  };
  return (
    <div className="space-y-4">
      <div className="sticky top-16 z-20 -mx-1 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface/95 px-4 py-3 backdrop-blur">
        <p className="text-[13px] text-muted-foreground">{dirty ? "Unsaved changes" : dirtyFromPublished ? "Draft differs from the live homepage" : "Draft matches the live homepage"}</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={saveDraft} loading={save.pending} disabled={!dirty}>Save draft</Button>
          <Button size="sm" variant="outline" asChild><a href="/?preview=draft" target="_blank" onClick={async (e) => { if (dirty) { e.preventDefault(); const r = await saveDraft(); if (r.ok) window.open("/?preview=draft", "_blank"); } }}><Eye className="h-4 w-4" /> Preview draft</a></Button>
          <Button size="sm" loading={publish.pending} onClick={async () => { if (dirty) { const r = await saveDraft(); if (!r.ok) return; } if (confirm("Publish the draft to the live homepage?")) publish.run(); }}><Rocket className="h-4 w-4" /> Publish</Button>
        </div>
      </div>
      <ul className="space-y-2">
        {sections.map((s, i) => (
          <li key={s.id} className={cn("rounded-xl border border-border bg-surface", !s.enabled && "opacity-60")}>
            <div className="flex items-center gap-2 px-4 py-3">
              <div className="flex flex-col">
                <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="rounded p-0.5 hover:bg-muted disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
                <button type="button" aria-label="Move down" disabled={i === sections.length - 1} onClick={() => move(i, 1)} className="rounded p-0.5 hover:bg-muted disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
              </div>
              <button type="button" className="flex flex-1 items-center gap-2 text-left" onClick={() => setOpen(open === s.id ? null : s.id)} aria-expanded={open === s.id}>
                <span className="font-medium">{SECTION_LABELS[s.type]}</span>
                {typeof s.content.title === "string" && <span className="truncate text-[13px] text-muted-foreground">— {s.content.title as string}</span>}
                {typeof s.content.headline === "string" && <span className="truncate text-[13px] text-muted-foreground">— {s.content.headline as string}</span>}
                {!s.published && <span className="rounded bg-amber-500/15 px-1.5 text-[11px] text-amber-700 dark:text-amber-300">new</span>}
                <ChevronDown className={cn("ml-auto h-4 w-4 transition", open === s.id && "rotate-180")} />
              </button>
              <Switch aria-label="Show section" checked={s.enabled} onCheckedChange={(c) => update(s.id, { enabled: c })} />
              <button type="button" aria-label="Delete section" className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-red-600" onClick={() => confirm("Delete this section?") && del.run(s.id)}><Trash2 className="h-4 w-4" /></button>
            </div>
            {open === s.id && <div className="border-t border-border p-4"><ContentEditor value={s.content} products={products} collections={collections} onChange={(c) => update(s.id, { content: c })} /></div>}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[13px] text-muted-foreground">Add section:</span>
        {(["edits", "editorial_banner", "product_rail", "category_cards", "featured_collections", "tryon_promo", "personalise_promo", "reviews", "trust", "newsletter", "recently_viewed", "club_national", "hero"] as SectionType[]).map((t) => (
          <Button key={t} size="sm" variant="ghost" loading={add.pending} onClick={() => add.run(t)}><Plus className="h-3.5 w-3.5" /> {SECTION_LABELS[t]}</Button>
        ))}
      </div>
    </div>
  );
}

export function AnnouncementEditor({ value }: { value: Settings["announcement"] }) {
  const [v, setV] = React.useState(value);
  const { run, pending } = useAction(saveSettingAction<"announcement">);
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); run("announcement", v); }}>
      <label className="flex items-center gap-2 text-sm"><Switch checked={v.enabled} onCheckedChange={(c) => setV({ ...v, enabled: c })} /> Show announcement bar</label>
      {v.messages.map((m, i) => (
        <div key={i} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-3">
          <Input aria-label="Message (English)" value={m.en} onChange={(e) => setV({ ...v, messages: v.messages.map((x, j) => (j === i ? { ...x, en: e.target.value } : x)) })} placeholder="English" />
          <Input aria-label="Message (Bangla)" value={m.bn} onChange={(e) => setV({ ...v, messages: v.messages.map((x, j) => (j === i ? { ...x, bn: e.target.value } : x)) })} placeholder="বাংলা" />
          <div className="flex gap-2"><Input aria-label="Link" value={m.href ?? ""} onChange={(e) => setV({ ...v, messages: v.messages.map((x, j) => (j === i ? { ...x, href: e.target.value || undefined } : x)) })} placeholder="/link (optional)" /><Button type="button" size="icon" variant="ghost" aria-label="Remove" onClick={() => setV({ ...v, messages: v.messages.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button></div>
        </div>
      ))}
      <div className="flex gap-2">{v.messages.length < 5 && <Button type="button" size="sm" variant="ghost" onClick={() => setV({ ...v, messages: [...v.messages, { en: "", bn: "" }] })}><Plus className="h-4 w-4" /> Add message</Button>}<Button type="submit" size="sm" loading={pending}>Save announcement</Button></div>
    </form>
  );
}

export function FooterBrandEditor({ footer, brand }: { footer: Settings["footer"]; brand: Settings["brand"] }) {
  const [f, setF] = React.useState(footer);
  const [b, setB] = React.useState(brand);
  const sf = useAction(saveSettingAction<"footer">);
  const sb = useAction(saveSettingAction<"brand">);
  const logo = useUpload("brand");
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); sb.run("brand", b); }}>
        <p className="font-medium">Brand</p>
        <Field label="Store name" htmlFor="bn"><Input id="bn" value={b.name} onChange={(e) => setB({ ...b, name: e.target.value })} /></Field>
        <Field label="Tagline" htmlFor="bt"><Input id="bt" value={b.tagline} onChange={(e) => setB({ ...b, tagline: e.target.value })} /></Field>
        <Field label="Logo" htmlFor="bl" hint="SVG/PNG/WebP on transparent background. Blank uses the text logo.">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {b.logoUrl && <img src={b.logoUrl} alt="" className="h-9 rounded border border-border bg-white p-1" />}
            <Input id="bl" value={b.logoUrl ?? ""} onChange={(e) => setB({ ...b, logoUrl: e.target.value || null })} />
            <label className="inline-flex shrink-0 cursor-pointer items-center rounded-lg border border-border px-2.5 py-2.5 text-[13px]">{logo.busy ? "…" : "Upload"}<input type="file" accept="image/png,image/webp,image/jpeg" className="sr-only" onChange={async (e) => { const fl = e.target.files?.[0]; if (fl) { const url = await logo.upload(fl); if (url) setB({ ...b, logoUrl: url }); } }} /></label>
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3"><Field label="Support phone" htmlFor="bp"><Input id="bp" value={b.supportPhone} onChange={(e) => setB({ ...b, supportPhone: e.target.value })} /></Field><Field label="Support email" htmlFor="be"><Input id="be" value={b.supportEmail} onChange={(e) => setB({ ...b, supportEmail: e.target.value })} /></Field></div>
        <Field label="Address" htmlFor="ba"><Input id="ba" value={b.address} onChange={(e) => setB({ ...b, address: e.target.value })} /></Field>
        <Button type="submit" size="sm" loading={sb.pending}>Save brand</Button>
      </form>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); sf.run("footer", f); }}>
        <p className="font-medium">Footer & social</p>
        <Field label="About (English)" htmlFor="fa"><Textarea id="fa" rows={3} value={f.about} onChange={(e) => setF({ ...f, about: e.target.value })} /></Field>
        <Field label="About (Bangla)" htmlFor="fab"><Textarea id="fab" rows={3} value={f.aboutBn} onChange={(e) => setF({ ...f, aboutBn: e.target.value })} /></Field>
        {(["facebook", "instagram", "tiktok", "youtube"] as const).map((k) => <Field key={k} label={humanize(k)} htmlFor={k}><Input id={k} value={f.social[k]} placeholder="https://" onChange={(e) => setF({ ...f, social: { ...f.social, [k]: e.target.value } })} /></Field>)}
        <Button type="submit" size="sm" loading={sf.pending}>Save footer</Button>
      </form>
    </div>
  );
}
