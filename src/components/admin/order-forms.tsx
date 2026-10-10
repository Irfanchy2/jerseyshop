"use client";

import * as React from "react";
import { Truck, AlertTriangle } from "lucide-react";
import type { OrderStatus } from "@prisma/client";
import { createShipmentAction, saveAdminNotesAction, updateOrderStatusAction } from "@/lib/admin/order-actions";
import { useAction } from "./use-action";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";

const LABEL: Record<string, string> = { CONFIRMED: "Confirm order", PROCESSING: "Mark processing", READY_TO_SHIP: "Ready to ship", SHIPPED: "Mark shipped", DELIVERED: "Mark delivered", CANCELLED: "Cancel order", RETURNED: "Mark returned" };

export function OrderStatusForm({ orderId, current, next }: { orderId: string; current: OrderStatus; next: OrderStatus[] }) {
  const { run, pending } = useAction(updateOrderStatusAction);
  const [status, setStatus] = React.useState<OrderStatus | "">(next[0] ?? "");
  const [note, setNote] = React.useState("");
  const [restock, setRestock] = React.useState(true);
  const nextKey = next.join(",");
  React.useEffect(() => setStatus((nextKey.split(",")[0] as OrderStatus) || ""), [nextKey]);
  if (!next.length) return <p className="text-sm text-muted-foreground">This order is {current.toLowerCase()} — no further status changes.</p>;
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!status) return;
        if (status === "CANCELLED" && !confirm("Cancel this order? Stock will be returned to inventory.")) return;
        const r = await run({ orderId, status, note: note || undefined, restock });
        if (r.ok) setNote("");
      }}
    >
      <div className="flex flex-wrap gap-2">
        {next.map((s) => (
          <button type="button" key={s} onClick={() => setStatus(s)} aria-pressed={status === s} className={`rounded-lg border px-3 py-1.5 text-[13px] font-medium ${status === s ? "border-foreground bg-foreground text-background" : "border-border hover:bg-muted"} ${s === "CANCELLED" ? "text-red-600" : ""}`}>
            {LABEL[s]}
          </button>
        ))}
      </div>
      <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional, shown on the customer's order timeline)" rows={2} />
      {status === "RETURNED" && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} /> Return items to stock</label>}
      <Button type="submit" size="sm" loading={pending} variant={status === "CANCELLED" ? "danger" : "primary"}>{status ? LABEL[status] : "Update"}</Button>
    </form>
  );
}

export function AdminNotesForm({ orderId, notes }: { orderId: string; notes: string }) {
  const { run, pending } = useAction(saveAdminNotesAction);
  const [v, setV] = React.useState(notes);
  return (
    <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); run(orderId, v); }}>
      <Textarea value={v} onChange={(e) => setV(e.target.value)} rows={3} placeholder="Visible to staff only" />
      <Button type="submit" size="sm" variant="outline" loading={pending}>Save notes</Button>
    </form>
  );
}

type Prov = { code: string; name: string; enabled: boolean; mode: string; isDefault: boolean };
type Loc = { id: number; name: string };

export function CreateShipmentDialog({ orderId, total, paid, providers, address }: { orderId: string; total: number; paid: boolean; providers: Prov[]; address: { district: string; area: string; cityId: number | null; zoneId: number | null; areaId: number | null } | null }) {
  const enabled = providers.filter((p) => p.enabled);
  const [open, setOpen] = React.useState(false);
  const [provider, setProvider] = React.useState(enabled.find((p) => p.isDefault)?.code ?? enabled[0]?.code ?? "");
  const [cod, setCod] = React.useState(paid ? "0" : (total / 100).toFixed(2));
  const [note, setNote] = React.useState("");
  const [weight, setWeight] = React.useState("0.5");
  const [step, setStep] = React.useState<"form" | "review">("form");
  const [cities, setCities] = React.useState<Loc[]>([]);
  const [zones, setZones] = React.useState<Loc[]>([]);
  const [areas, setAreas] = React.useState<Loc[]>([]);
  const [loc, setLoc] = React.useState({ cityId: address?.cityId ?? 0, zoneId: address?.zoneId ?? 0, areaId: address?.areaId ?? 0 });
  const [locError, setLocError] = React.useState<string | null>(null);
  const { run, pending } = useAction(createShipmentAction);
  const p = providers.find((x) => x.code === provider);
  const needsPathaoLoc = provider === "pathao" && p?.mode !== "MOCK";

  const load = React.useCallback(async (kind: string, parent?: number) => {
    setLocError(null);
    const r = await fetch(`/api/admin/couriers/pathao/locations?kind=${kind}${parent ? `&parent=${parent}` : ""}`);
    const d = await r.json();
    if (!r.ok) {
      setLocError(d.error ?? "Could not load Pathao locations");
      return [];
    }
    return d.items as Loc[];
  }, []);
  React.useEffect(() => { if (open && needsPathaoLoc && !cities.length) load("cities").then(setCities); }, [open, needsPathaoLoc, cities.length, load]);
  React.useEffect(() => { if (needsPathaoLoc && loc.cityId) load("zones", loc.cityId).then(setZones); }, [needsPathaoLoc, loc.cityId, load]);
  React.useEffect(() => { if (needsPathaoLoc && loc.zoneId) load("areas", loc.zoneId).then(setAreas); }, [needsPathaoLoc, loc.zoneId, load]);

  const submit = async () => {
    const r = await run({ orderId, provider: provider as "steadfast" | "pathao", codAmount: Number(cod), note: note || undefined, weightKg: Number(weight) || undefined, ...(needsPathaoLoc ? { pathaoCityId: loc.cityId || undefined, pathaoZoneId: loc.zoneId || undefined, pathaoAreaId: loc.areaId || undefined } : {}) });
    if (r.ok) {
      setOpen(false);
      setStep("form");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); setStep("form"); }}>
      <DialogTrigger asChild><Button size="sm"><Truck className="h-4 w-4" /> Create shipment</Button></DialogTrigger>
      <DialogContent title="Create shipment" description="Book a courier for this order. The order number is sent as the courier invoice reference." className="admin-theme max-w-xl">
        {enabled.length === 0 ? (
          <p className="text-sm text-muted-foreground">No courier is enabled. Configure Steadfast or Pathao in Settings → Delivery &amp; couriers.</p>
        ) : step === "form" ? (
          <div className="space-y-4">
            <Field label="Courier" htmlFor="prov">
              <NativeSelect id="prov" value={provider} onChange={(e) => setProvider(e.target.value)}>
                {enabled.map((x) => <option key={x.code} value={x.code}>{x.name} — {x.mode.toLowerCase()}{x.isDefault ? " (default)" : ""}</option>)}
              </NativeSelect>
            </Field>
            {p?.mode === "MOCK" && <p className="flex gap-2 rounded-lg bg-amber-500/10 p-3 text-[13px] text-amber-800 dark:text-amber-200"><AlertTriangle className="h-4 w-4 shrink-0" /> Mock mode: no real courier will be contacted and no parcel will be picked up.</p>}
            <div className="grid grid-cols-2 gap-3">
              <Field label="COD amount (৳)" htmlFor="cod" hint={paid ? "Order is prepaid" : "Collected from the customer"}><Input id="cod" inputMode="decimal" value={cod} onChange={(e) => setCod(e.target.value.replace(/[^\d.]/g, ""))} /></Field>
              <Field label="Weight (kg)" htmlFor="w"><Input id="w" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} /></Field>
            </div>
            {needsPathaoLoc && (
              <div className="space-y-3 rounded-lg border border-border p-3">
                <p className="text-[13px] font-medium">Pathao delivery location <span className="font-normal text-muted-foreground">(customer entered: {address?.area}, {address?.district})</span></p>
                {locError && <p className="text-[12px] text-red-600">{locError}</p>}
                <div className="grid gap-2 sm:grid-cols-3">
                  <NativeSelect aria-label="City" value={loc.cityId || ""} onChange={(e) => setLoc({ cityId: Number(e.target.value), zoneId: 0, areaId: 0 })}><option value="">City…</option>{cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</NativeSelect>
                  <NativeSelect aria-label="Zone" value={loc.zoneId || ""} onChange={(e) => setLoc((l) => ({ ...l, zoneId: Number(e.target.value), areaId: 0 }))}><option value="">Zone…</option>{zones.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</NativeSelect>
                  <NativeSelect aria-label="Area" value={loc.areaId || ""} onChange={(e) => setLoc((l) => ({ ...l, areaId: Number(e.target.value) }))}><option value="">Area (optional)…</option>{areas.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</NativeSelect>
                </div>
              </div>
            )}
            <Field label="Note for rider (optional)" htmlFor="note"><Input id="note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} /></Field>
            <Button onClick={() => setStep("review")} disabled={!provider || (needsPathaoLoc && !(loc.cityId && loc.zoneId))} block>Review booking</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <dl className="divide-y divide-border rounded-lg border border-border text-sm">
              {[["Courier", `${p?.name} (${p?.mode.toLowerCase()})`], ["Cash to collect", `৳${Number(cod).toLocaleString("en-IN")}`], ["Weight", `${weight} kg`], ...(needsPathaoLoc ? [["Pathao location", `city ${loc.cityId} · zone ${loc.zoneId}${loc.areaId ? ` · area ${loc.areaId}` : ""}`]] : []), ["Rider note", note || "—"]].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 px-3 py-2"><dt className="text-muted-foreground">{k}</dt><dd className="text-right font-medium">{v}</dd></div>
              ))}
            </dl>
            <p className="text-[12px] text-muted-foreground">Booking is protected against duplicates: an order can only have one active shipment.</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("form")}>Back</Button>
              <Button onClick={submit} loading={pending} className="flex-1">Confirm booking</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
