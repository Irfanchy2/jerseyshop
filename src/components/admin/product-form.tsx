"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ImagePlus, Plus, Trash2, Wand2, Box, ExternalLink } from "lucide-react";
import { saveProductAction, deleteProductAction, uploadMediaAction, type ProductInput } from "@/lib/admin/catalog-actions";
import { jerseySvg, type JerseyDesign } from "@/lib/jersey-art";
import { slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { Card } from "./ui";

type Opt = { id: string; name: string };
type Props = {
  initial: ProductInput & { id?: string };
  categories: Opt[];
  teams: Opt[];
  collections: Opt[];
  templates: (Opt & { price: number })[];
};

const KITS = ["HOME", "AWAY", "THIRD", "GOALKEEPER", "TRAINING", "RETRO", "FAN", "CUSTOM"] as const;
const PATTERNS = ["plain", "stripes", "pinstripe", "hoops", "halves", "sash", "chevron", "gradient", "band", "quarters"] as const;
const DEFAULT_SIZES = ["S", "M", "L", "XL", "XXL"];

export function useUpload(folder: string) {
  const [busy, setBusy] = React.useState(false);
  const upload = async (file: File) => {
    setBusy(true);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("folder", folder);
    const r = await uploadMediaAction(fd);
    setBusy(false);
    if (!r.ok) {
      toast({ title: r.error, tone: "error" });
      return null;
    }
    return r.url ?? null;
  };
  return { upload, busy };
}

export function ProductForm({ initial, categories, teams, collections, templates }: Props) {
  const router = useRouter();
  const [p, setP] = React.useState(initial);
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [slugTouched, setSlugTouched] = React.useState(!!initial.id);
  const imgUpload = useUpload("products");
  const garmentUpload = useUpload("garments");
  const modelUpload = useUpload("models");
  const set = <K extends keyof ProductInput>(k: K, v: ProductInput[K]) => setP((x) => ({ ...x, [k]: v }));

  const save = async (status?: ProductInput["status"]) => {
    setSaving(true);
    const r = await saveProductAction({ ...p, status: status ?? p.status });
    setSaving(false);
    if (!r.ok) {
      setErrors(r.fieldErrors ?? {});
      toast({ title: r.error, tone: "error" });
      return;
    }
    setErrors({});
    toast({ title: r.message ?? "Saved" });
    if (!p.id && r.id) router.replace(`/admin/products/${r.id}`);
    else router.refresh();
    if (status) set("status", status);
  };

  const design = p.design;
  const previewSvg = React.useMemo(() => (design ? jerseySvg(design as JerseyDesign, "front", { backdrop: "#efece6", width: 320 }) : null), [design]);

  const genVariants = () => {
    const colorName = p.variants[0]?.color || "Default";
    const hex = p.variants[0]?.colorHex || p.design?.base || "#111111";
    const prefix = (p.slug || slugify(p.name)).split("-").map((w) => w[0]).join("").toUpperCase().slice(0, 6) || "JS";
    const existing = new Set(p.variants.map((v) => `${v.size}|${v.color}`));
    const extra = DEFAULT_SIZES.filter((s) => !existing.has(`${s}|${colorName}`)).map((size) => ({ size, color: colorName, colorHex: hex, sku: `JS-${prefix}-${slugify(colorName).slice(0, 4).toUpperCase()}-${size}`, price: null, stock: 0, lowStockThreshold: 5, isActive: true }));
    set("variants", [...p.variants.filter((v) => v.sku), ...extra]);
  };

  const err = (k: string) => errors[k];

  return (
    <div className="pb-24">
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card title="General">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" htmlFor="name" error={err("name")} className="sm:col-span-2">
                <Input id="name" value={p.name} onChange={(e) => { set("name", e.target.value); if (!slugTouched) set("slug", slugify(e.target.value)); }} />
              </Field>
              <Field label="Name (Bangla)" htmlFor="nameBn"><Input id="nameBn" value={p.nameBn ?? ""} onChange={(e) => set("nameBn", e.target.value)} /></Field>
              <Field label="URL slug" htmlFor="slug" error={err("slug")} hint={`/products/${p.slug || "…"}`}><Input id="slug" value={p.slug ?? ""} onChange={(e) => { setSlugTouched(true); set("slug", slugify(e.target.value)); }} /></Field>
              <Field label="Description" htmlFor="desc" error={err("description")} className="sm:col-span-2"><Textarea id="desc" rows={5} value={p.description} onChange={(e) => set("description", e.target.value)} /></Field>
              <Field label="Description (Bangla)" htmlFor="descBn" className="sm:col-span-2"><Textarea id="descBn" rows={3} value={p.descriptionBn ?? ""} onChange={(e) => set("descriptionBn", e.target.value)} /></Field>
            </div>
          </Card>

          <Card title="Media" description="First image is the main image. Use FRONT/BACK kinds for the gallery switch." actions={
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[13px] font-medium hover:bg-muted">
              <ImagePlus className="h-4 w-4" /> {imgUpload.busy ? "Uploading…" : "Upload images"}
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={async (e) => {
                const files = [...(e.target.files ?? [])];
                for (const f of files) {
                  const url = await imgUpload.upload(f);
                  if (url) setP((x) => ({ ...x, images: [...x.images, { url, alt: "", kind: x.images.length === 0 ? "FRONT" : "DETAIL" }] }));
                }
                e.target.value = "";
              }} />
            </label>
          }>
            {p.images.length === 0 ? <p className="text-sm text-muted-foreground">No images yet. Upload photos you own, or generate catalog art from the design below.</p> : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {p.images.map((im, i) => (
                  <li key={im.url + i} className="flex gap-3 rounded-lg border border-border p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={im.url} alt="" className="h-20 w-16 shrink-0 rounded object-cover" />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <NativeSelect aria-label="Image kind" value={im.kind} className="h-8 text-xs" onChange={(e) => set("images", p.images.map((x, j) => (j === i ? { ...x, kind: e.target.value as typeof im.kind } : x)))}>
                        {["FRONT", "BACK", "DETAIL", "LIFESTYLE", "GARMENT"].map((k) => <option key={k}>{k}</option>)}
                      </NativeSelect>
                      <Input aria-label="Alt text" placeholder="Alt text" className="h-8 text-xs" value={im.alt ?? ""} onChange={(e) => set("images", p.images.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <button type="button" aria-label="Move up" disabled={i === 0} className="rounded p-1 hover:bg-muted disabled:opacity-30" onClick={() => { const a = [...p.images]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; set("images", a); }}><ArrowUp className="h-3.5 w-3.5" /></button>
                      <button type="button" aria-label="Move down" disabled={i === p.images.length - 1} className="rounded p-1 hover:bg-muted disabled:opacity-30" onClick={() => { const a = [...p.images]; [a[i + 1], a[i]] = [a[i], a[i + 1]]; set("images", a); }}><ArrowDown className="h-3.5 w-3.5" /></button>
                      <button type="button" aria-label="Remove image" className="rounded p-1 text-red-600 hover:bg-muted" onClick={() => set("images", p.images.filter((_, j) => j !== i))}><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Pricing" description="Prices in BDT. Scheduled sale prices apply automatically within the dates.">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Price (৳)" htmlFor="price" error={err("price")}><Input id="price" inputMode="decimal" value={p.price || ""} onChange={(e) => set("price", Number(e.target.value) || 0)} /></Field>
              <Field label="Compare-at price (৳)" htmlFor="cmp" hint="Original price shown struck through"><Input id="cmp" inputMode="decimal" value={p.compareAt ?? ""} onChange={(e) => set("compareAt", e.target.value ? Number(e.target.value) : null)} /></Field>
              <Field label="Sale price (৳)" htmlFor="sale" error={err("salePrice")}><Input id="sale" inputMode="decimal" value={p.salePrice ?? ""} onChange={(e) => set("salePrice", e.target.value ? Number(e.target.value) : null)} /></Field>
              <Field label="Sale starts" htmlFor="ss"><Input id="ss" type="datetime-local" value={p.saleStartsAt ?? ""} onChange={(e) => set("saleStartsAt", e.target.value || null)} /></Field>
              <Field label="Sale ends" htmlFor="se"><Input id="se" type="datetime-local" value={p.saleEndsAt ?? ""} onChange={(e) => set("saleEndsAt", e.target.value || null)} /></Field>
            </div>
          </Card>

          <Card title="Variants & inventory" description="Stock is tracked per size/colour variant." actions={<Button type="button" size="sm" variant="outline" onClick={genVariants}><Wand2 className="h-4 w-4" /> Add S–XXL</Button>}>
            {err("variants") && <p className="mb-3 text-sm text-red-600">{err("variants")}</p>}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead><tr className="text-left text-[12px] text-muted-foreground"><th className="pb-2 font-medium">Size</th><th className="pb-2 font-medium">Colour</th><th className="pb-2 font-medium">Hex</th><th className="pb-2 font-medium">SKU</th><th className="pb-2 font-medium">Price override</th><th className="pb-2 font-medium">Stock</th><th className="pb-2 font-medium">Low at</th><th className="pb-2 font-medium">Active</th><th /></tr></thead>
                <tbody>
                  {p.variants.map((v, i) => {
                    const upd = (patch: Partial<typeof v>) => set("variants", p.variants.map((x, j) => (j === i ? { ...x, ...patch } : x)));
                    return (
                      <tr key={v.id ?? i} className="border-t border-border">
                        <td className="py-1.5 pr-2"><Input aria-label="Size" className="h-8 w-20" value={v.size} onChange={(e) => upd({ size: e.target.value })} /></td>
                        <td className="py-1.5 pr-2"><Input aria-label="Colour" className="h-8 w-32" value={v.color} onChange={(e) => upd({ color: e.target.value })} /></td>
                        <td className="py-1.5 pr-2"><input aria-label="Colour hex" type="color" className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent" value={v.colorHex} onChange={(e) => upd({ colorHex: e.target.value })} /></td>
                        <td className="py-1.5 pr-2"><Input aria-label="SKU" className="h-8 w-44 font-mono text-xs" value={v.sku} onChange={(e) => upd({ sku: e.target.value.toUpperCase() })} /></td>
                        <td className="py-1.5 pr-2"><Input aria-label="Price override" className="h-8 w-24" inputMode="decimal" placeholder="—" value={v.price ?? ""} onChange={(e) => upd({ price: e.target.value ? Number(e.target.value) : null })} /></td>
                        <td className="py-1.5 pr-2"><Input aria-label="Stock" className="h-8 w-20" inputMode="numeric" value={v.stock} onChange={(e) => upd({ stock: Number(e.target.value.replace(/\D/g, "")) || 0 })} /></td>
                        <td className="py-1.5 pr-2"><Input aria-label="Low stock threshold" className="h-8 w-16" inputMode="numeric" value={v.lowStockThreshold} onChange={(e) => upd({ lowStockThreshold: Number(e.target.value.replace(/\D/g, "")) || 0 })} /></td>
                        <td className="py-1.5 pr-2"><Switch aria-label="Active" checked={v.isActive} onCheckedChange={(c) => upd({ isActive: c })} /></td>
                        <td className="py-1.5"><button type="button" aria-label="Remove variant" className="rounded p-1 text-red-600 hover:bg-muted" onClick={() => set("variants", p.variants.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Button type="button" size="sm" variant="ghost" className="mt-2" onClick={() => set("variants", [...p.variants, { size: "", color: p.variants[0]?.color ?? "", colorHex: p.variants[0]?.colorHex ?? "#111111", sku: "", price: null, stock: 0, lowStockThreshold: 5, isActive: true }])}><Plus className="h-4 w-4" /> Add variant</Button>
          </Card>

          <Card title="Details">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Fabric" htmlFor="fabric"><Textarea id="fabric" rows={2} value={p.fabric ?? ""} onChange={(e) => set("fabric", e.target.value)} /></Field>
              <Field label="Care" htmlFor="care"><Textarea id="care" rows={2} value={p.care ?? ""} onChange={(e) => set("care", e.target.value)} /></Field>
              <Field label="Fit" htmlFor="fit"><Textarea id="fit" rows={2} value={p.fit ?? ""} onChange={(e) => set("fit", e.target.value)} /></Field>
            </div>
          </Card>

          <Card title="SEO">
            <div className="grid gap-4">
              <Field label="SEO title" htmlFor="seot" hint={`${(p.seoTitle ?? "").length}/80`}><Input id="seot" value={p.seoTitle ?? ""} maxLength={80} onChange={(e) => set("seoTitle", e.target.value)} /></Field>
              <Field label="Meta description" htmlFor="seod" hint={`${(p.seoDescription ?? "").length}/200`}><Textarea id="seod" rows={2} maxLength={200} value={p.seoDescription ?? ""} onChange={(e) => set("seoDescription", e.target.value)} /></Field>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Status">
            <div className="space-y-4">
              <Field label="Visibility" htmlFor="status"><NativeSelect id="status" value={p.status} onChange={(e) => set("status", e.target.value as ProductInput["status"])}><option value="DRAFT">Draft (hidden)</option><option value="ACTIVE">Active (published)</option><option value="ARCHIVED">Archived</option></NativeSelect></Field>
              <Field label="Publish at (optional)" htmlFor="pub" hint="Schedule — the product appears from this time"><Input id="pub" type="datetime-local" value={p.publishedAt ?? ""} onChange={(e) => set("publishedAt", e.target.value || null)} /></Field>
              <label className="flex items-center justify-between text-sm">Featured <Switch checked={p.isFeatured} onCheckedChange={(c) => set("isFeatured", c)} /></label>
              <label className="flex items-center justify-between text-sm">Best seller badge <Switch checked={p.isBestSeller} onCheckedChange={(c) => set("isBestSeller", c)} /></label>
            </div>
          </Card>
          <Card title="Organisation">
            <div className="space-y-4">
              <Field label="Category" htmlFor="cat" error={err("categoryId")}><NativeSelect id="cat" value={p.categoryId} onChange={(e) => set("categoryId", e.target.value)}><option value="">Choose…</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</NativeSelect></Field>
              <Field label="Team" htmlFor="team"><NativeSelect id="team" value={p.teamId ?? ""} onChange={(e) => set("teamId", e.target.value)}><option value="">None</option>{teams.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</NativeSelect></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Season" htmlFor="season"><Input id="season" value={p.season ?? ""} placeholder="2026/27" onChange={(e) => set("season", e.target.value)} /></Field>
                <Field label="Kit" htmlFor="kit"><NativeSelect id="kit" value={p.kitType} onChange={(e) => set("kitType", e.target.value as ProductInput["kitType"])}>{KITS.map((k) => <option key={k} value={k}>{k.toLowerCase()}</option>)}</NativeSelect></Field>
              </div>
              <Field label="Collections" htmlFor="cols">
                <div id="cols" className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
                  {collections.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={p.collectionIds.includes(c.id)} onChange={(e) => set("collectionIds", e.target.checked ? [...p.collectionIds, c.id] : p.collectionIds.filter((x) => x !== c.id))} /> {c.name}</label>
                  ))}
                </div>
              </Field>
              <Field label="Tags (comma separated)" htmlFor="tags"><Input id="tags" value={p.tags.join(", ")} onChange={(e) => set("tags", e.target.value.split(",").map((t) => t.trim()).filter(Boolean))} /></Field>
            </div>
          </Card>

          <Card title="Catalog art" description="Original generated jersey artwork, used when you have no photography and for the 3D model.">
            <label className="mb-3 flex items-center justify-between text-sm">Use generated design <Switch checked={!!p.design} onCheckedChange={(c) => set("design", c ? { pattern: "plain", base: "#1f2937", secondary: "#ffffff", trim: "#ffffff", collar: "crew", crest: null } : null)} /></label>
            {p.design && (
              <div className="space-y-3">
                {previewSvg && <div className="mx-auto w-40 overflow-hidden rounded-lg [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: previewSvg }} />}
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Pattern" htmlFor="pat"><NativeSelect id="pat" className="h-9" value={p.design.pattern} onChange={(e) => set("design", { ...p.design!, pattern: e.target.value as (typeof PATTERNS)[number] })}>{PATTERNS.map((x) => <option key={x}>{x}</option>)}</NativeSelect></Field>
                  <Field label="Collar" htmlFor="col"><NativeSelect id="col" className="h-9" value={p.design.collar ?? "crew"} onChange={(e) => set("design", { ...p.design!, collar: e.target.value as "crew" })}><option>crew</option><option>v</option><option>polo</option></NativeSelect></Field>
                  {(["base", "secondary", "trim"] as const).map((k) => (
                    <label key={k} className="flex items-center justify-between rounded-lg border border-border px-2 py-1.5 text-[13px] capitalize">{k}<input type="color" value={p.design![k]} onChange={(e) => set("design", { ...p.design!, [k]: e.target.value })} className="h-6 w-8 cursor-pointer bg-transparent" /></label>
                  ))}
                  <label className="flex items-center justify-between rounded-lg border border-border px-2 py-1.5 text-[13px]">Long sleeve<input type="checkbox" checked={!!p.design.longSleeve} onChange={(e) => set("design", { ...p.design!, longSleeve: e.target.checked })} /></label>
                  <Field label="Crest initials" htmlFor="crest"><Input id="crest" className="h-9" maxLength={3} value={p.design.crest?.initials ?? ""} onChange={(e) => set("design", { ...p.design!, crest: e.target.value ? { shape: p.design!.crest?.shape ?? "shield", initials: e.target.value.toUpperCase() } : null })} /></Field>
                  <Field label="Crest shape" htmlFor="cshape"><NativeSelect id="cshape" className="h-9" value={p.design.crest?.shape ?? "shield"} onChange={(e) => p.design!.crest && set("design", { ...p.design!, crest: { ...p.design!.crest, shape: e.target.value as "shield" } })}><option>shield</option><option>circle</option><option>diamond</option></NativeSelect></Field>
                </div>
                <Button type="button" size="sm" variant="outline" block disabled={!p.slug} onClick={() => {
                  const art = [{ url: `/art/jersey/${p.slug}/front.svg`, alt: "", kind: "FRONT" as const }, { url: `/art/jersey/${p.slug}/back.svg`, alt: "", kind: "BACK" as const }];
                  set("images", [...art, ...p.images.filter((im) => !im.url.startsWith("/art/jersey/"))]);
                  toast({ title: "Generated art added to images (save to apply)" });
                }}><Wand2 className="h-4 w-4" /> Use as product images</Button>
              </div>
            )}
          </Card>

          <Card title="AI Virtual Try-On">
            <label className="mb-3 flex items-center justify-between text-sm">Enable try-on <Switch checked={p.tryOnEnabled} onCheckedChange={(c) => set("tryOnEnabled", c)} /></label>
            <Field label="Garment image" htmlFor="garment" hint="Flat-lay or ghost-mannequin photo of the front on a plain background. Defaults to the generated art.">
              <div className="flex gap-2">
                <Input id="garment" value={p.garmentImageUrl ?? ""} onChange={(e) => set("garmentImageUrl", e.target.value || null)} placeholder={p.slug ? `/art/jersey/${p.slug}/garment.png` : ""} />
                <label className="inline-flex shrink-0 cursor-pointer items-center rounded-lg border border-border px-2.5 text-[13px] hover:bg-muted">{garmentUpload.busy ? "…" : "Upload"}<input type="file" accept="image/*" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const url = await garmentUpload.upload(f); if (url) set("garmentImageUrl", url); } }} /></label>
              </div>
            </Field>
            {p.garmentImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.garmentImageUrl} alt="Garment" className="mt-2 h-24 rounded border border-border object-contain" />
            )}
          </Card>

          <Card title="Personalisation & 3D">
            <label className="mb-3 flex items-center justify-between text-sm">Allow name & number <Switch checked={p.customizable} onCheckedChange={(c) => set("customizable", c)} /></label>
            {p.customizable && (
              <Field label="Template" htmlFor="tpl" error={err("templateId")}><NativeSelect id="tpl" value={p.templateId ?? ""} onChange={(e) => set("templateId", e.target.value || null)}><option value="">Choose…</option>{templates.map((t) => <option key={t.id} value={t.id}>{t.name} (+৳{t.price / 100})</option>)}</NativeSelect></Field>
            )}
            <Field label="3D model (GLB, optional)" htmlFor="glb" className="mt-3" hint="Use only properly licensed models. Without one, a procedural jersey is rendered.">
              <div className="flex gap-2">
                <Input id="glb" value={p.model3dUrl ?? ""} onChange={(e) => set("model3dUrl", e.target.value || null)} />
                <label className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-border px-2.5 text-[13px] hover:bg-muted"><Box className="h-3.5 w-3.5" />{modelUpload.busy ? "…" : "Upload"}<input type="file" accept=".glb,model/gltf-binary" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const url = await modelUpload.upload(f); if (url) set("model3dUrl", url); } }} /></label>
              </div>
            </Field>
          </Card>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur lg:left-[var(--admin-sidebar,248px)]">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-4 py-3 md:px-8">
          <div className="text-[13px] text-muted-foreground">{p.id ? "Editing product" : "New product"} · {p.status.toLowerCase()}</div>
          <div className="flex gap-2">
            {p.id && <Button type="button" variant="ghost" size="sm" onClick={async () => { if (!confirm("Delete this product? Products with orders are archived instead.")) return; const r = await deleteProductAction(p.id!); toast({ title: r.ok ? r.message ?? "Done" : r.error, tone: r.ok ? "success" : "error" }); if (r.ok) router.push("/admin/products"); }}>Delete</Button>}
            {p.id && p.status === "ACTIVE" && p.slug && <Button asChild variant="outline" size="sm"><a href={`/products/${p.slug}`} target="_blank"><ExternalLink className="h-4 w-4" /> View</a></Button>}
            {p.status !== "ACTIVE" && <Button type="button" variant="outline" size="sm" loading={saving} onClick={() => save("ACTIVE")}>Save & publish</Button>}
            <Button type="button" size="sm" loading={saving} onClick={() => save()}>Save</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
