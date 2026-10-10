"use client";

import * as React from "react";
import { Plug, Trash2 } from "lucide-react";
import { saveSecretAction, saveSettingAction, testTryOnProviderAction, saveSampleModelAction } from "@/lib/admin/settings-actions";
import type { Settings } from "@/lib/settings";
import { useAction } from "./use-action";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export function TryOnSettingsForm({ value, secret }: { value: Settings["tryon"]; secret: { configured: boolean; hint: string | null } }) {
  const [v, setV] = React.useState(value);
  const [sa, setSa] = React.useState("");
  const save = useAction(saveSettingAction<"tryon">);
  const saveSecret = useAction(saveSecretAction);
  const test = useAction(testTryOnProviderAction);
  const addModel = useAction(saveSampleModelAction);
  const usd = (micro: number) => (micro / 1_000_000).toFixed(2);
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <form className="space-y-4 rounded-xl border border-border bg-surface p-5" onSubmit={(e) => { e.preventDefault(); save.run("tryon", v); }}>
        <label className="flex items-center justify-between font-medium">Virtual try-on enabled <Switch checked={v.enabled} onCheckedChange={(c) => setV({ ...v, enabled: c })} /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Provider" htmlFor="tp"><NativeSelect id="tp" value={v.provider} onChange={(e) => setV({ ...v, provider: e.target.value as Settings["tryon"]["provider"] })}><option value="google-vertex">Google Cloud Vertex AI — Virtual Try-On</option><option value="demo">Demo mode (no AI)</option></NativeSelect></Field>
          <Field label="Model ID" htmlFor="tm" hint="e.g. virtual-try-on-001 (check availability in your project)"><Input id="tm" value={v.model} onChange={(e) => setV({ ...v, model: e.target.value })} /></Field>
          <Field label="Google Cloud project ID" htmlFor="tpr"><Input id="tpr" value={v.googleProject} onChange={(e) => setV({ ...v, googleProject: e.target.value })} placeholder="from service account if blank" /></Field>
          <Field label="Region" htmlFor="tl"><Input id="tl" value={v.googleLocation} onChange={(e) => setV({ ...v, googleLocation: e.target.value })} /></Field>
        </div>
        <p className="pt-2 text-[13px] font-medium">Limits & cost controls</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Per customer per day" htmlFor="l1"><Input id="l1" inputMode="numeric" value={v.dailyLimitPerUser} onChange={(e) => setV({ ...v, dailyLimitPerUser: Number(e.target.value) || 1 })} /></Field>
          <Field label="Store-wide per day" htmlFor="l2"><Input id="l2" inputMode="numeric" value={v.dailyLimitGlobal} onChange={(e) => setV({ ...v, dailyLimitGlobal: Number(e.target.value) || 1 })} /></Field>
          <Field label="Estimated cost per image (USD)" htmlFor="l3" hint="Used for budget tracking — check current Google pricing"><Input id="l3" inputMode="decimal" value={usd(v.estimatedCostPerImageMicroUsd)} onChange={(e) => setV({ ...v, estimatedCostPerImageMicroUsd: Math.round(Number(e.target.value) * 1_000_000) || 0 })} /></Field>
          <Field label="Monthly budget (USD, 0 = no cap)" htmlFor="l4"><Input id="l4" inputMode="decimal" value={usd(v.monthlyBudgetMicroUsd)} onChange={(e) => setV({ ...v, monthlyBudgetMicroUsd: Math.round(Number(e.target.value) * 1_000_000) || 0 })} /></Field>
        </div>
        <p className="pt-2 text-[13px] font-medium">Privacy</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Delete photos after (hours)" htmlFor="r1"><Input id="r1" inputMode="numeric" value={v.retentionHours} onChange={(e) => setV({ ...v, retentionHours: Number(e.target.value) || 1 })} /></Field>
          <Field label="Max upload (MB)" htmlFor="r2"><Input id="r2" inputMode="numeric" value={v.maxUploadMb} onChange={(e) => setV({ ...v, maxUploadMb: Number(e.target.value) || 1 })} /></Field>
          <Field label="Consent version" htmlFor="r3" hint="Bump when terms change"><Input id="r3" value={v.consentVersion} onChange={(e) => setV({ ...v, consentVersion: e.target.value })} /></Field>
        </div>
        <Button type="submit" loading={save.pending}>Save try-on settings</Button>
      </form>

      <div className="space-y-6">
        <form className="space-y-3 rounded-xl border border-border bg-surface p-5" onSubmit={async (e) => { e.preventDefault(); const r = await saveSecret.run("tryon.google", { serviceAccountJson: sa }); if (r.ok) setSa(""); }}>
          <p className="font-medium">Google Cloud credentials</p>
          <p className="text-[13px] text-muted-foreground">Service account with the <em>Vertex AI User</em> role. Stored encrypted on the server; never sent to browsers. {secret.configured ? <strong className="text-foreground">Configured ({secret.hint}).</strong> : "Not configured — try-on runs in clearly-labelled demo mode."}</p>
          <Textarea rows={5} value={sa} onChange={(e) => setSa(e.target.value)} placeholder='{"type":"service_account","client_email":"…","private_key":"…"}' className="font-mono text-[12px]" aria-label="Service account JSON" />
          <div className="flex gap-2"><Button type="submit" size="sm" loading={saveSecret.pending} disabled={!sa}>Save credentials</Button><Button type="button" size="sm" variant="outline" loading={test.pending} onClick={() => test.run()}><Plug className="h-4 w-4" /> Test credentials</Button></div>
        </form>
        <div className="space-y-3 rounded-xl border border-border bg-surface p-5">
          <p className="font-medium">Sample models</p>
          <p className="text-[13px] text-muted-foreground">Photos customers can use instead of their own. Only upload photos you own with the model&apos;s written consent.</p>
          <ul className="space-y-1 text-sm">{v.sampleModels.map((m) => <li key={m.id} className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-1.5">{m.label}<button type="button" aria-label="Remove" onClick={() => { const next = { ...v, sampleModels: v.sampleModels.filter((x) => x.id !== m.id) }; setV(next); save.run("tryon", next); }}><Trash2 className="h-4 w-4" /></button></li>)}</ul>
          <form className="grid gap-2 sm:grid-cols-[1fr_auto]" action={async (fd) => { await addModel.run(fd); }}>
            <Input name="label" placeholder="Label, e.g. Model A (M)" aria-label="Sample model label" />
            <input name="file" type="file" accept="image/jpeg,image/png,image/webp" className="text-[12px]" aria-label="Sample model photo" />
            <label className="flex items-center gap-2 text-[12px] sm:col-span-2"><input type="checkbox" name="rights" /> I own this photo and have the model&apos;s consent to use it for virtual try-on.</label>
            <Button type="submit" size="sm" variant="outline" loading={addModel.pending}>Add sample model</Button>
          </form>
        </div>
      </div>
    </div>
  );
}

export function PaymentSettingsForm({ value, secret }: { value: Settings["payments"]; secret: { configured: boolean; hint: string | null } }) {
  const [v, setV] = React.useState(value);
  const [creds, setCreds] = React.useState({ storeId: "", storePassword: "" });
  const save = useAction(saveSettingAction<"payments">);
  const saveSecret = useAction(saveSecretAction);
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <form className="space-y-4 rounded-xl border border-border bg-surface p-5" onSubmit={(e) => { e.preventDefault(); save.run("payments", v); }}>
        <p className="font-medium">Cash on Delivery</p>
        <label className="flex items-center justify-between text-sm">Enable Cash on Delivery <Switch checked={v.codEnabled} onCheckedChange={(c) => setV({ ...v, codEnabled: c })} /></label>
        <Field label="Maximum COD order (৳)" htmlFor="cm"><Input id="cm" inputMode="numeric" value={v.codMaxOrderMinor / 100} onChange={(e) => setV({ ...v, codMaxOrderMinor: Math.round(Number(e.target.value) * 100) || 0 })} /></Field>
        <p className="pt-2 font-medium">SSLCommerz (cards, bKash, Nagad, Rocket)</p>
        <label className="flex items-center justify-between text-sm">Enable online payment <Switch checked={v.sslcommerzEnabled} onCheckedChange={(c) => setV({ ...v, sslcommerzEnabled: c })} /></label>
        <label className="flex items-center justify-between text-sm">Sandbox mode <Switch checked={v.sslcommerzSandbox} onCheckedChange={(c) => setV({ ...v, sslcommerzSandbox: c })} /></label>
        <p className="text-[12px] text-muted-foreground">Orders paid online are marked paid only after SSLCommerz&apos;s validation API confirms the transaction and amount (IPN: <code>/api/payments/sslcommerz/ipn</code>).</p>
        <Button type="submit" loading={save.pending}>Save payment settings</Button>
      </form>
      <form className="space-y-3 rounded-xl border border-border bg-surface p-5" onSubmit={async (e) => { e.preventDefault(); const r = await saveSecret.run("payments.sslcommerz", creds); if (r.ok) setCreds({ storeId: "", storePassword: "" }); }}>
        <p className="font-medium">SSLCommerz credentials</p>
        <p className="text-[13px] text-muted-foreground">{secret.configured ? `Configured (${secret.hint}). Enter both fields to replace.` : "Not configured."}</p>
        <Field label="Store ID" htmlFor="si"><Input id="si" autoComplete="off" value={creds.storeId} onChange={(e) => setCreds({ ...creds, storeId: e.target.value })} /></Field>
        <Field label="Store password" htmlFor="sp"><Input id="sp" type="password" autoComplete="off" value={creds.storePassword} onChange={(e) => setCreds({ ...creds, storePassword: e.target.value })} /></Field>
        <Button type="submit" size="sm" loading={saveSecret.pending} disabled={!creds.storeId || !creds.storePassword}>Save credentials</Button>
      </form>
    </div>
  );
}

export function MarketingSettingsForm({ value, seo }: { value: Settings["marketing"]; seo: Settings["seo"] }) {
  const [v, setV] = React.useState(value);
  const [s, setS] = React.useState(seo);
  const save = useAction(saveSettingAction<"marketing">);
  const saveSeo = useAction(saveSettingAction<"seo">);
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <form className="space-y-3 rounded-xl border border-border bg-surface p-5" onSubmit={(e) => { e.preventDefault(); save.run("marketing", v); }}>
        <p className="font-medium">Tracking integrations</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Google Analytics 4 ID" htmlFor="ga"><Input id="ga" placeholder="G-XXXXXXX" value={v.ga4Id} onChange={(e) => setV({ ...v, ga4Id: e.target.value.trim() })} /></Field>
          <Field label="Google Tag Manager ID" htmlFor="gtm"><Input id="gtm" placeholder="GTM-XXXXXX" value={v.gtmId} onChange={(e) => setV({ ...v, gtmId: e.target.value.trim() })} /></Field>
          <Field label="Meta Pixel ID" htmlFor="mp"><Input id="mp" value={v.metaPixelId} onChange={(e) => setV({ ...v, metaPixelId: e.target.value.trim() })} /></Field>
          <Field label="TikTok Pixel ID" htmlFor="tt"><Input id="tt" value={v.tiktokPixelId} onChange={(e) => setV({ ...v, tiktokPixelId: e.target.value.trim() })} /></Field>
        </div>
        <label className="flex items-center justify-between text-sm">Require visitor consent before loading tags <Switch checked={v.requireConsent} onCheckedChange={(c) => setV({ ...v, requireConsent: c })} /></label>
        <Button type="submit" loading={save.pending}>Save integrations</Button>
      </form>
      <form className="space-y-3 rounded-xl border border-border bg-surface p-5" onSubmit={(e) => { e.preventDefault(); saveSeo.run("seo", s); }}>
        <p className="font-medium">SEO defaults</p>
        <Field label="Default title" htmlFor="st"><Input id="st" value={s.defaultTitle} onChange={(e) => setS({ ...s, defaultTitle: e.target.value })} /></Field>
        <Field label="Default description" htmlFor="sd"><Textarea id="sd" rows={3} value={s.defaultDescription} onChange={(e) => setS({ ...s, defaultDescription: e.target.value })} /></Field>
        <p className="text-[12px] text-muted-foreground">Sitemap: <code>/sitemap.xml</code> · robots: <code>/robots.txt</code> · products include schema.org Product data.</p>
        <Button type="submit" loading={saveSeo.pending}>Save SEO</Button>
      </form>
    </div>
  );
}
