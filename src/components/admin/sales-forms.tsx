"use client";

import * as React from "react";
import { Plus, Pencil, Trash2, Check, X, RefreshCw } from "lucide-react";
import { saveCouponAction, deleteCouponAction, saveBundleAction, moderateReviewAction, markNotificationsReadAction, updateInquiryAction, processDeletionAction } from "@/lib/admin/sales-actions";
import { syncShipmentsAction } from "@/lib/admin/order-actions";
import { useAction } from "./use-action";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input, NativeSelect } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { StatusBadge, Table } from "./ui";

type Coupon = { id?: string; code: string; description: string; type: "PERCENT" | "FIXED" | "FREE_SHIPPING"; value: number; minSubtotal: number; maxDiscount: number | null; startsAt: string | null; endsAt: string | null; usageLimit: number | null; perCustomerLimit: number | null; isActive: boolean; usedCount?: number };

export function CouponsManager({ items }: { items: Coupon[] }) {
  const [edit, setEdit] = React.useState<Coupon | null>(null);
  const save = useAction(saveCouponAction);
  const del = useAction(deleteCouponAction);
  const desc = (c: Coupon) => (c.type === "PERCENT" ? `${c.value}% off${c.maxDiscount ? ` (max ৳${c.maxDiscount})` : ""}` : c.type === "FIXED" ? `৳${c.value} off` : "Free delivery");
  return (
    <>
      <div className="mb-3"><Button size="sm" onClick={() => setEdit({ code: "", description: "", type: "PERCENT", value: 10, minSubtotal: 0, maxDiscount: null, startsAt: null, endsAt: null, usageLimit: null, perCustomerLimit: null, isActive: true })}><Plus className="h-4 w-4" /> New coupon</Button></div>
      <Table>
        <thead><tr><th>Code</th><th>Discount</th><th>Min. spend</th><th>Usage</th><th>Valid</th><th>Status</th><th /></tr></thead>
        <tbody>{items.map((c) => (
          <tr key={c.id}>
            <td className="font-mono font-semibold">{c.code}<p className="font-sans text-[12px] font-normal text-muted-foreground">{c.description}</p></td>
            <td>{desc(c)}</td><td className="tabular">{c.minSubtotal ? `৳${c.minSubtotal}` : "—"}</td>
            <td className="tabular">{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ""}{c.perCustomerLimit ? <span className="text-[11px] text-muted-foreground"> · {c.perCustomerLimit}/customer</span> : null}</td>
            <td className="text-[12px] text-muted-foreground">{c.startsAt ? new Date(c.startsAt).toLocaleDateString("en-GB") : "now"} → {c.endsAt ? new Date(c.endsAt).toLocaleDateString("en-GB") : "no end"}</td>
            <td><StatusBadge status={c.isActive ? "ACTIVE" : "DRAFT"} label={c.isActive ? "active" : "inactive"} /></td>
            <td className="text-right"><Button size="icon-sm" variant="ghost" aria-label="Edit" onClick={() => setEdit(c)}><Pencil className="h-4 w-4" /></Button><Button size="icon-sm" variant="ghost" aria-label="Delete" onClick={() => confirm(`Delete ${c.code}?`) && del.run(c.id!)}><Trash2 className="h-4 w-4" /></Button></td>
          </tr>
        ))}</tbody>
      </Table>
      <Dialog open={!!edit} onOpenChange={(v) => !v && setEdit(null)}>
        {edit && (
          <DialogContent title={edit.id ? `Edit ${edit.code}` : "New coupon"} className="admin-theme max-w-xl">
            <form className="grid gap-3 sm:grid-cols-2" onSubmit={async (e) => { e.preventDefault(); const r = await save.run(edit); if (r.ok) setEdit(null); }}>
              <Field label="Code" htmlFor="cc" error={save.fieldErrors.code}><Input id="cc" className="uppercase" value={edit.code} onChange={(e) => setEdit({ ...edit, code: e.target.value.toUpperCase() })} /></Field>
              <Field label="Type" htmlFor="ct"><NativeSelect id="ct" value={edit.type} onChange={(e) => setEdit({ ...edit, type: e.target.value as Coupon["type"] })}><option value="PERCENT">Percentage</option><option value="FIXED">Fixed amount</option><option value="FREE_SHIPPING">Free delivery</option></NativeSelect></Field>
              {edit.type !== "FREE_SHIPPING" && <Field label={edit.type === "PERCENT" ? "Percent off" : "Amount off (৳)"} htmlFor="cv" error={save.fieldErrors.value}><Input id="cv" inputMode="decimal" value={edit.value} onChange={(e) => setEdit({ ...edit, value: Number(e.target.value) || 0 })} /></Field>}
              {edit.type === "PERCENT" && <Field label="Max discount (৳)" htmlFor="cm"><Input id="cm" inputMode="decimal" value={edit.maxDiscount ?? ""} onChange={(e) => setEdit({ ...edit, maxDiscount: e.target.value ? Number(e.target.value) : null })} /></Field>}
              <Field label="Minimum spend (৳)" htmlFor="cmin"><Input id="cmin" inputMode="decimal" value={edit.minSubtotal} onChange={(e) => setEdit({ ...edit, minSubtotal: Number(e.target.value) || 0 })} /></Field>
              <Field label="Total uses (blank = unlimited)" htmlFor="cu"><Input id="cu" inputMode="numeric" value={edit.usageLimit ?? ""} onChange={(e) => setEdit({ ...edit, usageLimit: e.target.value ? Number(e.target.value) : null })} /></Field>
              <Field label="Uses per customer (by phone)" htmlFor="cpc"><Input id="cpc" inputMode="numeric" value={edit.perCustomerLimit ?? ""} onChange={(e) => setEdit({ ...edit, perCustomerLimit: e.target.value ? Number(e.target.value) : null })} /></Field>
              <Field label="Starts" htmlFor="cs"><Input id="cs" type="datetime-local" value={edit.startsAt ?? ""} onChange={(e) => setEdit({ ...edit, startsAt: e.target.value || null })} /></Field>
              <Field label="Ends" htmlFor="ce"><Input id="ce" type="datetime-local" value={edit.endsAt ?? ""} onChange={(e) => setEdit({ ...edit, endsAt: e.target.value || null })} /></Field>
              <Field label="Description (shown at checkout)" htmlFor="cd" className="sm:col-span-2"><Input id="cd" value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></Field>
              <label className="flex items-center gap-2 text-sm"><Switch checked={edit.isActive} onCheckedChange={(v) => setEdit({ ...edit, isActive: v })} /> Active</label>
              <div className="sm:col-span-2"><Button type="submit" loading={save.pending}>Save coupon</Button></div>
            </form>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}

type Bundle = { id?: string; name: string; description: string; discountPercent: number; isActive: boolean; productIds: string[] };
export function BundlesManager({ items, products }: { items: Bundle[]; products: { id: string; name: string }[] }) {
  const [edit, setEdit] = React.useState<Bundle | null>(null);
  const save = useAction(saveBundleAction);
  return (
    <>
      <div className="mb-3"><Button size="sm" variant="outline" onClick={() => setEdit({ name: "", description: "", discountPercent: 10, isActive: true, productIds: [] })}><Plus className="h-4 w-4" /> New bundle</Button></div>
      <ul className="space-y-2">{items.map((b) => (
        <li key={b.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-sm">
          <div><p className="font-medium">{b.name} <span className="text-muted-foreground">· {b.discountPercent}% off together</span>{!b.isActive && " · inactive"}</p><p className="text-[12px] text-muted-foreground">{b.productIds.map((id) => products.find((p) => p.id === id)?.name).join(" + ")}</p></div>
          <Button size="sm" variant="ghost" onClick={() => setEdit(b)}>Edit</Button>
        </li>
      ))}</ul>
      <Dialog open={!!edit} onOpenChange={(v) => !v && setEdit(null)}>
        {edit && (
          <DialogContent title={edit.id ? "Edit bundle" : "New bundle"} description="Discount applies when every product in the bundle is in the bag." className="admin-theme">
            <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); const r = await save.run(edit); if (r.ok) setEdit(null); }}>
              <Field label="Name" htmlFor="bn"><Input id="bn" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
              <Field label="Description" htmlFor="bd"><Input id="bd" value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></Field>
              <Field label="Discount %" htmlFor="bp"><Input id="bp" inputMode="numeric" value={edit.discountPercent} onChange={(e) => setEdit({ ...edit, discountPercent: Number(e.target.value) || 0 })} /></Field>
              <Field label={`Products (${edit.productIds.length})`} htmlFor="bpr"><div id="bpr" className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border p-2">{products.map((p) => <label key={p.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.productIds.includes(p.id)} onChange={(e) => setEdit({ ...edit, productIds: e.target.checked ? [...edit.productIds, p.id] : edit.productIds.filter((x) => x !== p.id) })} />{p.name}</label>)}</div></Field>
              <label className="flex items-center gap-2 text-sm"><Switch checked={edit.isActive} onCheckedChange={(v) => setEdit({ ...edit, isActive: v })} /> Active</label>
              <Button type="submit" loading={save.pending}>Save bundle</Button>
            </form>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}

export function ReviewActions({ id, status }: { id: string; status: string }) {
  const { run, pending } = useAction(moderateReviewAction);
  return (
    <div className="flex gap-1">
      {status !== "APPROVED" && <Button size="sm" variant="outline" loading={pending} onClick={() => run(id, "APPROVED")}><Check className="h-4 w-4" /> Approve</Button>}
      {status !== "REJECTED" && <Button size="sm" variant="ghost" loading={pending} onClick={() => run(id, "REJECTED")}><X className="h-4 w-4" /> Reject</Button>}
    </div>
  );
}

export function MarkAllRead() {
  const { run, pending } = useAction(markNotificationsReadAction);
  return <Button size="sm" variant="outline" loading={pending} onClick={() => run()}>Mark all as read</Button>;
}

export function InquiryStatus({ id, status }: { id: string; status: string }) {
  const { run, pending } = useAction(updateInquiryAction);
  return status === "open" ? <Button size="sm" variant="outline" loading={pending} onClick={() => run(id, "resolved")}>Mark resolved</Button> : <Button size="sm" variant="ghost" loading={pending} onClick={() => run(id, "open")}>Reopen</Button>;
}

export function ProcessDeletion({ id }: { id: string }) {
  const { run, pending } = useAction(processDeletionAction);
  return <Button size="sm" variant="danger" loading={pending} onClick={() => confirm("Permanently delete this customer's personal data? Orders are kept anonymised.") && run(id)}>Process deletion</Button>;
}

export function SyncShipments() {
  const { run, pending } = useAction(syncShipmentsAction);
  return <Button size="sm" variant="outline" loading={pending} onClick={() => run()}><RefreshCw className="h-4 w-4" /> Sync courier status</Button>;
}
