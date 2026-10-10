"use client";

import * as React from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { saveCategoryAction, deleteCategoryAction, saveCollectionAction, deleteCollectionAction, adjustStockAction, saveTemplateAction } from "@/lib/admin/catalog-actions";
import { useAction } from "./use-action";
import { useUpload } from "./product-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { StatusBadge, Table } from "./ui";
import { formatDateTime } from "@/lib/utils";

/* ── Categories ── */
type Cat = { id?: string; name: string; nameBn: string; slug: string; description: string; parentId: string | null; sortOrder: number; isActive: boolean; count?: number };
export function CategoriesManager({ items }: { items: Cat[] }) {
  const [edit, setEdit] = React.useState<Cat | null>(null);
  const save = useAction(saveCategoryAction);
  const del = useAction(deleteCategoryAction);
  return (
    <>
      <div className="mb-4"><Button size="sm" onClick={() => setEdit({ name: "", nameBn: "", slug: "", description: "", parentId: null, sortOrder: items.length, isActive: true })}><Plus className="h-4 w-4" /> Add category</Button></div>
      <Table>
        <thead><tr><th>Name</th><th>Slug</th><th>Parent</th><th className="text-right">Products</th><th>Status</th><th /></tr></thead>
        <tbody>{items.map((c) => (
          <tr key={c.id}><td className="font-medium">{c.name}<span className="ml-2 text-muted-foreground">{c.nameBn}</span></td><td className="font-mono text-[12px]">{c.slug}</td><td className="text-muted-foreground">{items.find((x) => x.id === c.parentId)?.name ?? "—"}</td><td className="text-right tabular">{c.count}</td><td><StatusBadge status={c.isActive ? "ACTIVE" : "DRAFT"} label={c.isActive ? "visible" : "hidden"} /></td>
            <td className="text-right"><Button size="icon-sm" variant="ghost" aria-label="Edit" onClick={() => setEdit(c)}><Pencil className="h-4 w-4" /></Button><Button size="icon-sm" variant="ghost" aria-label="Delete" onClick={() => confirm(`Delete ${c.name}?`) && del.run(c.id!)}><Trash2 className="h-4 w-4" /></Button></td></tr>
        ))}</tbody>
      </Table>
      <Dialog open={!!edit} onOpenChange={(v) => !v && setEdit(null)}>
        {edit && (
          <DialogContent title={edit.id ? "Edit category" : "Add category"} className="admin-theme">
            <form className="grid gap-3" onSubmit={async (e) => { e.preventDefault(); const r = await save.run({ ...edit, id: edit.id }); if (r.ok) setEdit(null); }}>
              <Field label="Name" htmlFor="cn"><Input id="cn" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
              <Field label="Name (Bangla)" htmlFor="cnb"><Input id="cnb" value={edit.nameBn} onChange={(e) => setEdit({ ...edit, nameBn: e.target.value })} /></Field>
              <Field label="Slug" htmlFor="cs" hint="Leave blank to generate"><Input id="cs" value={edit.slug} onChange={(e) => setEdit({ ...edit, slug: e.target.value })} /></Field>
              <Field label="Parent" htmlFor="cp"><NativeSelect id="cp" value={edit.parentId ?? ""} onChange={(e) => setEdit({ ...edit, parentId: e.target.value || null })}><option value="">None</option>{items.filter((x) => x.id !== edit.id).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</NativeSelect></Field>
              <Field label="Description" htmlFor="cd"><Textarea id="cd" rows={2} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></Field>
              <div className="flex items-center gap-4"><Field label="Order" htmlFor="co"><Input id="co" className="w-24" inputMode="numeric" value={edit.sortOrder} onChange={(e) => setEdit({ ...edit, sortOrder: Number(e.target.value) || 0 })} /></Field><label className="mt-5 flex items-center gap-2 text-sm"><Switch checked={edit.isActive} onCheckedChange={(v) => setEdit({ ...edit, isActive: v })} /> Visible</label></div>
              <Button type="submit" loading={save.pending}>Save</Button>
            </form>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}

/* ── Collections ── */
type Col = { id?: string; name: string; nameBn: string; slug: string; description: string; kind: "CURATED" | "CLUB" | "NATIONAL" | "SEASONAL" | "TRAINING"; imageUrl: string | null; accentHex: string | null; isFeatured: boolean; isActive: boolean; sortOrder: number; productIds: string[] };
export function CollectionsManager({ items, products }: { items: (Col & { count: number })[]; products: { id: string; name: string }[] }) {
  const [edit, setEdit] = React.useState<Col | null>(null);
  const [filter, setFilter] = React.useState("");
  const save = useAction(saveCollectionAction);
  const del = useAction(deleteCollectionAction);
  const up = useUpload("collections");
  return (
    <>
      <div className="mb-4"><Button size="sm" onClick={() => setEdit({ name: "", nameBn: "", slug: "", description: "", kind: "CURATED", imageUrl: null, accentHex: "#1f2937", isFeatured: false, isActive: true, sortOrder: items.length, productIds: [] })}><Plus className="h-4 w-4" /> Add collection</Button></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((c) => (
          <div key={c.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4">
            <span className="h-12 w-12 shrink-0 rounded-lg" style={{ background: c.accentHex ?? "#999" }} />
            <div className="min-w-0 flex-1"><p className="truncate font-medium">{c.name}</p><p className="text-[12px] text-muted-foreground">{c.count} products · {c.kind.toLowerCase()}{c.isFeatured ? " · featured" : ""}{!c.isActive ? " · hidden" : ""}</p></div>
            <Button size="icon-sm" variant="ghost" aria-label="Edit" onClick={() => setEdit(c)}><Pencil className="h-4 w-4" /></Button>
            <Button size="icon-sm" variant="ghost" aria-label="Delete" onClick={() => confirm(`Delete ${c.name}?`) && del.run(c.id!)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
      </div>
      <Dialog open={!!edit} onOpenChange={(v) => !v && setEdit(null)}>
        {edit && (
          <DialogContent title={edit.id ? "Edit collection" : "Add collection"} className="admin-theme max-w-2xl">
            <form className="grid gap-3 sm:grid-cols-2" onSubmit={async (e) => { e.preventDefault(); const r = await save.run(edit); if (r.ok) setEdit(null); }}>
              <Field label="Name" htmlFor="kn"><Input id="kn" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
              <Field label="Name (Bangla)" htmlFor="knb"><Input id="knb" value={edit.nameBn} onChange={(e) => setEdit({ ...edit, nameBn: e.target.value })} /></Field>
              <Field label="Slug" htmlFor="ks"><Input id="ks" value={edit.slug} onChange={(e) => setEdit({ ...edit, slug: e.target.value })} /></Field>
              <Field label="Type" htmlFor="kk"><NativeSelect id="kk" value={edit.kind} onChange={(e) => setEdit({ ...edit, kind: e.target.value as Col["kind"] })}>{["CURATED", "CLUB", "NATIONAL", "SEASONAL", "TRAINING"].map((k) => <option key={k} value={k}>{k.toLowerCase()}</option>)}</NativeSelect></Field>
              <Field label="Description" htmlFor="kd" className="sm:col-span-2"><Textarea id="kd" rows={2} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></Field>
              <Field label="Accent colour" htmlFor="ka"><input id="ka" type="color" value={edit.accentHex ?? "#1f2937"} onChange={(e) => setEdit({ ...edit, accentHex: e.target.value })} className="h-10 w-16 rounded border border-border" /></Field>
              <Field label="Cover image (optional)" htmlFor="ki">
                <div className="flex gap-2"><Input id="ki" value={edit.imageUrl ?? ""} onChange={(e) => setEdit({ ...edit, imageUrl: e.target.value || null })} /><label className="inline-flex cursor-pointer items-center rounded-lg border border-border px-2.5 text-[13px]">{up.busy ? "…" : "Upload"}<input type="file" accept="image/*" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const url = await up.upload(f); if (url) setEdit({ ...edit, imageUrl: url }); } }} /></label></div>
              </Field>
              <label className="flex items-center gap-2 text-sm"><Switch checked={edit.isFeatured} onCheckedChange={(v) => setEdit({ ...edit, isFeatured: v })} /> Featured</label>
              <label className="flex items-center gap-2 text-sm"><Switch checked={edit.isActive} onCheckedChange={(v) => setEdit({ ...edit, isActive: v })} /> Visible</label>
              <Field label={`Products (${edit.productIds.length})`} htmlFor="kp" className="sm:col-span-2">
                <Input id="kp" placeholder="Filter products…" value={filter} onChange={(e) => setFilter(e.target.value)} className="mb-2 h-9" />
                <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
                  {products.filter((p) => p.name.toLowerCase().includes(filter.toLowerCase())).map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.productIds.includes(p.id)} onChange={(e) => setEdit({ ...edit, productIds: e.target.checked ? [...edit.productIds, p.id] : edit.productIds.filter((x) => x !== p.id) })} /> {p.name}</label>
                  ))}
                </div>
              </Field>
              <div className="sm:col-span-2"><Button type="submit" loading={save.pending}>Save collection</Button></div>
            </form>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}

/* ── Inventory ── */
type InvRow = { id: string; sku: string; product: string; productId: string; size: string; color: string; stock: number; low: number; movements: { delta: number; reason: string; at: string; after: number; note: string | null }[] };
export function InventoryTable({ rows, canWrite }: { rows: InvRow[]; canWrite: boolean }) {
  const [adj, setAdj] = React.useState<InvRow | null>(null);
  const [delta, setDelta] = React.useState("");
  const [reason, setReason] = React.useState<"restock" | "adjustment" | "damage" | "return">("restock");
  const [note, setNote] = React.useState("");
  const { run, pending } = useAction(adjustStockAction);
  return (
    <>
      <Table>
        <thead><tr><th>SKU</th><th>Product</th><th>Size</th><th>Colour</th><th className="text-right">Stock</th><th>Last movement</th>{canWrite && <th />}</tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.id}>
            <td className="font-mono text-[12px]">{r.sku}</td><td><a href={`/admin/products/${r.productId}`} className="hover:underline">{r.product}</a></td><td>{r.size}</td><td>{r.color}</td>
            <td className="text-right"><span className={`rounded px-1.5 py-0.5 font-semibold tabular ${r.stock === 0 ? "bg-red-500/12 text-red-700 dark:text-red-300" : r.stock <= r.low ? "bg-amber-500/12 text-amber-700 dark:text-amber-300" : ""}`}>{r.stock}</span></td>
            <td className="text-[12px] text-muted-foreground">{r.movements[0] ? `${r.movements[0].delta > 0 ? "+" : ""}${r.movements[0].delta} ${r.movements[0].reason} · ${formatDateTime(r.movements[0].at)}` : "—"}</td>
            {canWrite && <td className="text-right"><Button size="sm" variant="outline" onClick={() => { setAdj(r); setDelta(""); setNote(""); }}>Adjust</Button></td>}
          </tr>
        ))}</tbody>
      </Table>
      <Dialog open={!!adj} onOpenChange={(v) => !v && setAdj(null)}>
        {adj && (
          <DialogContent title={`Adjust ${adj.sku}`} description={`Current stock: ${adj.stock}. Use a negative number to remove stock.`} className="admin-theme">
            <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); const r = await run({ variantId: adj.id, delta: Number(delta), reason, note: note || undefined }); if (r.ok) setAdj(null); }}>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Quantity (+/−)" htmlFor="ad"><Input id="ad" inputMode="numeric" value={delta} onChange={(e) => setDelta(e.target.value.replace(/[^\d-]/g, ""))} placeholder="e.g. 10 or -2" /></Field>
                <Field label="Reason" htmlFor="ar"><NativeSelect id="ar" value={reason} onChange={(e) => setReason(e.target.value as typeof reason)}><option value="restock">Restock</option><option value="adjustment">Stock count adjustment</option><option value="damage">Damaged</option><option value="return">Customer return</option></NativeSelect></Field>
              </div>
              <Field label="Note" htmlFor="an"><Input id="an" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
              <Button type="submit" loading={pending}>Apply</Button>
              {adj.movements.length > 0 && (
                <div className="border-t border-border pt-3"><p className="mb-2 text-[12px] font-medium">Recent movements</p><ul className="space-y-1 text-[12px] text-muted-foreground">{adj.movements.map((m, i) => <li key={i} className="flex justify-between"><span>{m.delta > 0 ? "+" : ""}{m.delta} · {m.reason}{m.note ? ` · ${m.note}` : ""}</span><span>→ {m.after} · {formatDateTime(m.at)}</span></li>)}</ul></div>
              )}
            </form>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}

/* ── Customisation templates ── */
type Area = { x: number; y: number; w: number; h: number };
type Tpl = { id?: string; name: string; modelUrl: string | null; nameArea: Area; numberArea: Area; frontNumberArea: Area | null; allowedColors: string[]; allowedFonts: ("block" | "classic" | "modern")[]; price: number; maxNameLength: number; maxNumberDigits: number; isActive: boolean; products?: number };
function AreaInputs({ label, value, onChange }: { label: string; value: Area; onChange: (a: Area) => void }) {
  return (
    <fieldset className="rounded-lg border border-border p-3"><legend className="px-1 text-[12px] font-medium">{label} <span className="text-muted-foreground">(0–1 of texture)</span></legend>
      <div className="grid grid-cols-4 gap-2">{(["x", "y", "w", "h"] as const).map((k) => <label key={k} className="text-[11px] text-muted-foreground">{k}<Input className="h-8" inputMode="decimal" value={value[k]} onChange={(e) => onChange({ ...value, [k]: Number(e.target.value) || 0 })} /></label>)}</div>
    </fieldset>
  );
}
export function TemplatesManager({ items }: { items: Tpl[] }) {
  const [edit, setEdit] = React.useState<Tpl | null>(null);
  const save = useAction(saveTemplateAction);
  const up = useUpload("models");
  return (
    <>
      <div className="mb-4"><Button size="sm" onClick={() => setEdit({ name: "", modelUrl: null, nameArea: { x: 0.2, y: 0.24, w: 0.6, h: 0.08 }, numberArea: { x: 0.25, y: 0.34, w: 0.5, h: 0.32 }, frontNumberArea: null, allowedColors: ["#ffffff", "#111111"], allowedFonts: ["block"], price: 300, maxNameLength: 12, maxNumberDigits: 2, isActive: true })}><Plus className="h-4 w-4" /> Add template</Button></div>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((t) => (
          <div key={t.id} className="rounded-xl border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-3"><div><p className="font-medium">{t.name}</p><p className="text-[12px] text-muted-foreground">+৳{t.price} · max {t.maxNameLength} letters · {t.maxNumberDigits} digits · {t.products} products{!t.isActive ? " · inactive" : ""}</p></div><Button size="sm" variant="outline" onClick={() => setEdit(t)}>Edit</Button></div>
            <div className="mt-3 flex flex-wrap gap-1.5">{t.allowedColors.map((c) => <span key={c} className="h-5 w-5 rounded-full border border-border" style={{ background: c }} title={c} />)}<span className="ml-2 text-[12px] text-muted-foreground">{t.allowedFonts.join(", ")}</span></div>
          </div>
        ))}
      </div>
      <Dialog open={!!edit} onOpenChange={(v) => !v && setEdit(null)}>
        {edit && (
          <DialogContent title={edit.id ? "Edit template" : "Add template"} description="Defines what customers may personalise and where it prints." className="admin-theme max-w-2xl">
            <form className="grid gap-3 sm:grid-cols-2" onSubmit={async (e) => { e.preventDefault(); const r = await save.run(edit); if (r.ok) setEdit(null); }}>
              <Field label="Name" htmlFor="tn" className="sm:col-span-2"><Input id="tn" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
              <Field label="Personalisation price (৳)" htmlFor="tp"><Input id="tp" inputMode="decimal" value={edit.price} onChange={(e) => setEdit({ ...edit, price: Number(e.target.value) || 0 })} /></Field>
              <div className="grid grid-cols-2 gap-2"><Field label="Max name length" htmlFor="tl"><Input id="tl" inputMode="numeric" value={edit.maxNameLength} onChange={(e) => setEdit({ ...edit, maxNameLength: Number(e.target.value) || 1 })} /></Field><Field label="Number digits" htmlFor="td"><Input id="td" inputMode="numeric" value={edit.maxNumberDigits} onChange={(e) => setEdit({ ...edit, maxNumberDigits: Number(e.target.value) || 1 })} /></Field></div>
              <AreaInputs label="Back name area" value={edit.nameArea} onChange={(a) => setEdit({ ...edit, nameArea: a })} />
              <AreaInputs label="Back number area" value={edit.numberArea} onChange={(a) => setEdit({ ...edit, numberArea: a })} />
              <div className="sm:col-span-2">
                <label className="mb-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={!!edit.frontNumberArea} onChange={(e) => setEdit({ ...edit, frontNumberArea: e.target.checked ? { x: 0.56, y: 0.27, w: 0.12, h: 0.1 } : null })} /> Print small number on the front</label>
                {edit.frontNumberArea && <AreaInputs label="Front number area" value={edit.frontNumberArea} onChange={(a) => setEdit({ ...edit, frontNumberArea: a })} />}
              </div>
              <Field label="Allowed print colours" htmlFor="tc" className="sm:col-span-2">
                <div id="tc" className="flex flex-wrap items-center gap-2">
                  {edit.allowedColors.map((c, i) => (
                    <span key={i} className="flex items-center gap-1 rounded-full border border-border py-0.5 pl-0.5 pr-2"><input type="color" aria-label={`Colour ${i + 1}`} value={c} onChange={(e) => setEdit({ ...edit, allowedColors: edit.allowedColors.map((x, j) => (j === i ? e.target.value : x)) })} className="h-6 w-6 cursor-pointer rounded-full bg-transparent" /><button type="button" aria-label="Remove colour" onClick={() => setEdit({ ...edit, allowedColors: edit.allowedColors.filter((_, j) => j !== i) })} className="text-xs text-muted-foreground">×</button></span>
                  ))}
                  <Button type="button" size="sm" variant="ghost" onClick={() => setEdit({ ...edit, allowedColors: [...edit.allowedColors, "#c81d25"] })}>+ Colour</Button>
                </div>
              </Field>
              <Field label="Allowed fonts" htmlFor="tf" className="sm:col-span-2">
                <div id="tf" className="flex gap-4">{(["block", "classic", "modern"] as const).map((f) => <label key={f} className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={edit.allowedFonts.includes(f)} onChange={(e) => setEdit({ ...edit, allowedFonts: e.target.checked ? [...edit.allowedFonts, f] : edit.allowedFonts.filter((x) => x !== f) })} /> {f}</label>)}</div>
              </Field>
              <Field label="3D model (GLB, optional)" htmlFor="tm" className="sm:col-span-2" hint="Properly licensed models only. Mesh names containing 'back' receive the back texture.">
                <div className="flex gap-2"><Input id="tm" value={edit.modelUrl ?? ""} onChange={(e) => setEdit({ ...edit, modelUrl: e.target.value || null })} /><label className="inline-flex cursor-pointer items-center rounded-lg border border-border px-2.5 text-[13px]">{up.busy ? "…" : "Upload"}<input type="file" accept=".glb" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const url = await up.upload(f); if (url) setEdit({ ...edit, modelUrl: url }); } }} /></label></div>
              </Field>
              <label className="flex items-center gap-2 text-sm"><Switch checked={edit.isActive} onCheckedChange={(v) => setEdit({ ...edit, isActive: v })} /> Active</label>
              <div className="sm:col-span-2"><Button type="submit" loading={save.pending}>Save template</Button></div>
            </form>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
