"use client";

import * as React from "react";
import { CheckCircle2, XCircle, CircleDashed, Copy, Plug } from "lucide-react";
import { saveCourierAction, testCourierAction, saveShippingRateAction, deleteShippingRateAction, saveSettingAction } from "@/lib/admin/settings-actions";
import { useAction } from "./use-action";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { DIVISIONS, BD_DIVISIONS } from "@/lib/bd-locations";
import type { Settings } from "@/lib/settings";

type Provider = {
  code: "steadfast" | "pathao";
  name: string;
  isEnabled: boolean;
  isDefault: boolean;
  mode: "MOCK" | "SANDBOX" | "LIVE";
  status: string;
  lastCheckedAt: string | null;
  lastError: string | null;
  publicConfig: Record<string, string | number | null>;
  configured: Record<string, string | null>; // masked hints for stored secrets
};

const SECRET_FIELDS: Record<string, { key: string; label: string; type?: string }[]> = {
  steadfast: [{ key: "apiKey", label: "API key" }, { key: "secretKey", label: "Secret key" }, { key: "webhookToken", label: "Webhook bearer token (you choose)" }],
  pathao: [{ key: "clientId", label: "Client ID" }, { key: "clientSecret", label: "Client secret" }, { key: "username", label: "Merchant email (username)" }, { key: "password", label: "Merchant password", type: "password" }, { key: "webhookSecret", label: "Webhook secret" }],
};

export function CourierCard({ p, webhookUrl }: { p: Provider; webhookUrl: string }) {
  const [state, setState] = React.useState({ isEnabled: p.isEnabled, isDefault: p.isDefault, mode: p.mode, publicConfig: p.publicConfig });
  const [secrets, setSecrets] = React.useState<Record<string, string>>({});
  const save = useAction(saveCourierAction);
  const test = useAction(testCourierAction);
  const cfg = (k: string) => (state.publicConfig[k] ?? "") as string | number;
  const setCfg = (k: string, v: string | number | null) => setState((s) => ({ ...s, publicConfig: { ...s.publicConfig, [k]: v } }));
  const StatusIcon = p.status === "CONNECTED" ? CheckCircle2 : p.status === "ERROR" ? XCircle : CircleDashed;
  return (
    <section className="rounded-xl border border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="font-semibold">{p.name}</h2>
          <p className={`mt-0.5 flex items-center gap-1.5 text-[12px] ${p.status === "CONNECTED" ? "text-emerald-600" : p.status === "ERROR" ? "text-red-600" : "text-muted-foreground"}`}>
            <StatusIcon className="h-3.5 w-3.5" /> {p.status === "CONNECTED" ? "Connected" : p.status === "ERROR" ? "Connection error" : "Not tested"}{p.lastCheckedAt ? ` · checked ${new Date(p.lastCheckedAt).toLocaleString("en-GB")}` : ""}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">Enabled <Switch checked={state.isEnabled} onCheckedChange={(v) => setState((s) => ({ ...s, isEnabled: v }))} /></label>
      </div>
      <div className="space-y-5 p-5">
        {p.lastError && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-[13px] text-red-700 dark:text-red-300">{p.lastError}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Mode" htmlFor={`${p.code}-mode`} hint={state.mode === "MOCK" ? "No real courier calls — bookings are clearly marked as mock." : state.mode === "SANDBOX" ? "Pathao sandbox environment." : "Real bookings and pickups."}>
            <NativeSelect id={`${p.code}-mode`} value={state.mode} onChange={(e) => setState((s) => ({ ...s, mode: e.target.value as Provider["mode"] }))}>
              <option value="MOCK">Mock (testing)</option>
              {p.code === "pathao" && <option value="SANDBOX">Sandbox</option>}
              <option value="LIVE">Live</option>
            </NativeSelect>
          </Field>
          <label className="flex items-center gap-2 self-end pb-3 text-sm"><input type="checkbox" checked={state.isDefault} onChange={(e) => setState((s) => ({ ...s, isDefault: e.target.checked }))} /> Default courier</label>
        </div>
        <div>
          <p className="mb-3 text-[13px] font-medium">Credentials <span className="font-normal text-muted-foreground">— stored encrypted, never shown again. Leave blank to keep the saved value.</span></p>
          <div className="grid gap-4 sm:grid-cols-2">
            {SECRET_FIELDS[p.code].map((f) => (
              <Field key={f.key} label={f.label} htmlFor={`${p.code}-${f.key}`} hint={p.configured[f.key] ? `Saved: ${p.configured[f.key]}` : "Not set"}>
                <Input id={`${p.code}-${f.key}`} type={f.type ?? "password"} autoComplete="off" value={secrets[f.key] ?? ""} onChange={(e) => setSecrets((s) => ({ ...s, [f.key]: e.target.value }))} placeholder={p.configured[f.key] ? "••••••••" : ""} />
              </Field>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {p.code === "steadfast" ? (
            <>
              <Field label="Delivery type" htmlFor="sf-dt"><NativeSelect id="sf-dt" value={String(cfg("deliveryType") || 0)} onChange={(e) => setCfg("deliveryType", Number(e.target.value))}><option value="0">Home delivery</option><option value="1">Point delivery / hub pickup</option></NativeSelect></Field>
              <Field label="Default rider note" htmlFor="sf-note" className="sm:col-span-2"><Input id="sf-note" value={String(cfg("defaultNote"))} onChange={(e) => setCfg("defaultNote", e.target.value)} /></Field>
            </>
          ) : (
            <>
              <Field label="Store ID" htmlFor="pa-store"><Input id="pa-store" inputMode="numeric" value={String(cfg("storeId") ?? "")} onChange={(e) => setCfg("storeId", e.target.value ? Number(e.target.value.replace(/\D/g, "")) : null)} /></Field>
              <Field label="Delivery type" htmlFor="pa-dt"><NativeSelect id="pa-dt" value={String(cfg("deliveryType") || 48)} onChange={(e) => setCfg("deliveryType", Number(e.target.value))}><option value="48">Normal (48h)</option><option value="12">On-demand (12h)</option></NativeSelect></Field>
              <Field label="Default weight (kg)" htmlFor="pa-w"><Input id="pa-w" inputMode="decimal" value={String(cfg("itemWeightKg") || 0.5)} onChange={(e) => setCfg("itemWeightKg", Number(e.target.value) || 0.5)} /></Field>
              <Field label="Webhook integration secret" htmlFor="pa-int" className="sm:col-span-3" hint="Value Pathao shows when you register the webhook; returned in every webhook response header."><Input id="pa-int" value={String(cfg("webhookIntegrationSecret") ?? "")} onChange={(e) => setCfg("webhookIntegrationSecret", e.target.value)} /></Field>
            </>
          )}
        </div>
        <div className="rounded-lg bg-muted/60 p-3 text-[12px]">
          <p className="font-medium">Webhook URL</p>
          <div className="mt-1 flex items-center gap-2"><code className="truncate">{webhookUrl}</code><button type="button" onClick={() => { navigator.clipboard.writeText(webhookUrl); toast({ title: "Copied" }); }} aria-label="Copy webhook URL"><Copy className="h-3.5 w-3.5" /></button></div>
          <p className="mt-1 text-muted-foreground">Without webhooks, statuses are polled every ~10 minutes by the background worker.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => save.run({ code: p.code, ...state, secrets }).then((r) => r.ok && setSecrets({}))} loading={save.pending}>Save</Button>
          <Button variant="outline" onClick={() => test.run(p.code)} loading={test.pending}><Plug className="h-4 w-4" /> Test connection</Button>
        </div>
      </div>
    </section>
  );
}

type Rate = { id: string; code: string; name: string; nameBn: string | null; fee: number; etaText: string; districts: string[]; isActive: boolean; sortOrder: number };

export function RatesEditor({ rates }: { rates: Rate[] }) {
  const save = useAction(saveShippingRateAction);
  const del = useAction(deleteShippingRateAction);
  const [editing, setEditing] = React.useState<Rate | null>(null);
  const blank: Rate = { id: "", code: "", name: "", nameBn: "", fee: 0, etaText: "", districts: [], isActive: true, sortOrder: rates.length };
  const allDistricts = DIVISIONS.flatMap((d) => BD_DIVISIONS[d]).sort();
  return (
    <div className="space-y-3">
      <ul className="divide-y divide-border rounded-lg border border-border">
        {rates.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
            <div><p className="font-medium">{r.name} <span className="text-muted-foreground">· ৳{r.fee} · {r.etaText}</span>{!r.isActive && <span className="ml-2 text-[11px] text-muted-foreground">(inactive)</span>}</p><p className="text-[12px] text-muted-foreground">{r.districts.length ? r.districts.join(", ") : "Fallback for all other districts"}</p></div>
            <div className="flex gap-2"><Button size="sm" variant="ghost" onClick={() => setEditing(r)}>Edit</Button><Button size="sm" variant="ghost" onClick={() => confirm("Delete this rate?") && del.run(r.id)}>Delete</Button></div>
          </li>
        ))}
      </ul>
      {editing ? (
        <form className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-3" onSubmit={async (e) => { e.preventDefault(); const r = await save.run({ ...editing, id: editing.id || undefined, nameBn: editing.nameBn ?? undefined }); if (r.ok) setEditing(null); }}>
          <Field label="Code" htmlFor="rc"><Input id="rc" value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value })} placeholder="inside_dhaka" /></Field>
          <Field label="Name" htmlFor="rn"><Input id="rn" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
          <Field label="Name (Bangla)" htmlFor="rnb"><Input id="rnb" value={editing.nameBn ?? ""} onChange={(e) => setEditing({ ...editing, nameBn: e.target.value })} /></Field>
          <Field label="Fee (৳)" htmlFor="rf"><Input id="rf" inputMode="decimal" value={editing.fee} onChange={(e) => setEditing({ ...editing, fee: Number(e.target.value) || 0 })} /></Field>
          <Field label="Delivery time" htmlFor="re"><Input id="re" value={editing.etaText} onChange={(e) => setEditing({ ...editing, etaText: e.target.value })} placeholder="1–2 days" /></Field>
          <label className="flex items-center gap-2 self-end pb-3 text-sm"><input type="checkbox" checked={editing.isActive} onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })} /> Active</label>
          <Field label="Districts (empty = fallback)" htmlFor="rd" className="sm:col-span-3">
            <select id="rd" multiple value={editing.districts} onChange={(e) => setEditing({ ...editing, districts: [...e.target.selectedOptions].map((o) => o.value) })} className="h-36 w-full rounded-lg border border-border bg-surface p-2 text-sm">
              {allDistricts.map((d) => <option key={d}>{d}</option>)}
            </select>
          </Field>
          <div className="flex gap-2 sm:col-span-3"><Button type="submit" size="sm" loading={save.pending}>Save rate</Button><Button type="button" size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button></div>
        </form>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setEditing(blank)}>Add delivery rate</Button>
      )}
    </div>
  );
}

export function DeliverySettingsForm({ value }: { value: Settings["delivery"] }) {
  const [v, setV] = React.useState(value);
  const { run, pending } = useAction(saveSettingAction<"delivery">);
  return (
    <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); run("delivery", v); }}>
      <Field label="Free delivery threshold (৳, blank = off)" htmlFor="fd"><Input id="fd" inputMode="numeric" value={v.freeShippingThresholdMinor != null ? v.freeShippingThresholdMinor / 100 : ""} onChange={(e) => setV({ ...v, freeShippingThresholdMinor: e.target.value ? Math.round(Number(e.target.value) * 100) : null })} /></Field>
      <Field label="Exchange window (days)" htmlFor="rd2"><Input id="rd2" inputMode="numeric" value={v.returnPolicyDays} onChange={(e) => setV({ ...v, returnPolicyDays: Number(e.target.value) || 0 })} /></Field>
      <Field label="Processing time text" htmlFor="pt" className="sm:col-span-2"><Input id="pt" value={v.processingDaysText} onChange={(e) => setV({ ...v, processingDaysText: e.target.value })} /></Field>
      <div className="space-y-3 rounded-lg border border-border p-4 sm:col-span-2">
        <label className="flex items-center justify-between gap-3 text-sm font-medium">Auto-book courier when an order is confirmed <Switch checked={v.autoBookEnabled} onCheckedChange={(c) => setV({ ...v, autoBookEnabled: c })} /></label>
        <p className="text-[12px] text-muted-foreground">Only runs after staff confirm the order, and only if every rule below passes. Failures notify staff and are never retried silently.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Courier" htmlFor="ab"><NativeSelect id="ab" value={v.autoBookProvider ?? ""} onChange={(e) => setV({ ...v, autoBookProvider: (e.target.value || null) as Settings["delivery"]["autoBookProvider"] })}><option value="">—</option><option value="steadfast">Steadfast</option><option value="pathao">Pathao</option></NativeSelect></Field>
          <Field label="Max COD amount for auto-booking (৳)" htmlFor="abm"><Input id="abm" inputMode="numeric" value={v.autoBookMaxCodMinor / 100} onChange={(e) => setV({ ...v, autoBookMaxCodMinor: Math.round(Number(e.target.value) * 100) || 0 })} /></Field>
        </div>
      </div>
      <div><Button type="submit" loading={pending}>Save delivery settings</Button></div>
    </form>
  );
}
