"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { audit, redact } from "@/lib/audit";
import { decryptJson, encryptJson, last4 } from "@/lib/crypto";
import { saveSetting, settingSchemas, type SettingKey, type Settings } from "@/lib/settings";
import { setSecret } from "@/lib/secrets";
import { getAdapter } from "@/lib/couriers/service";
import type { PermissionKey } from "@/lib/auth/permissions";
import { staffAction, fail, type ActionResult } from "./guard";

const SETTING_PERMISSION: Record<SettingKey, PermissionKey> = {
  brand: "settings.write", appearance: "content.write", announcement: "content.write", footer: "content.write", seo: "settings.write",
  tryon: "tryon.manage", payments: "settings.write", delivery: "settings.write", marketing: "settings.write",
};

export async function saveSettingAction<K extends SettingKey>(key: K, value: Settings[K], opts: { draft?: boolean } = {}): Promise<ActionResult> {
  try {
    const staff = await staffAction(SETTING_PERMISSION[key]);
    settingSchemas[key].parse(value);
    await saveSetting(key, value, { actorId: staff.id, draft: opts.draft });
    await audit({ actorId: staff.id, action: opts.draft ? "settings.draft" : "settings.update", entityType: "setting", entityId: key, diff: redact(value) as Prisma.InputJsonValue });
    revalidatePath("/", "layout");
    return { ok: true, message: opts.draft ? "Draft saved." : "Settings saved." };
  } catch (e) {
    return fail(e);
  }
}

/** Publish a previously saved draft (e.g. appearance) so the live storefront uses it. */
export async function publishSettingDraftAction(key: SettingKey): Promise<ActionResult> {
  try {
    const staff = await staffAction(SETTING_PERMISSION[key]);
    const row = await db.siteSetting.findUnique({ where: { key } });
    if (!row?.draftValue) return { ok: false, error: "There is no draft to publish." };
    await db.siteSetting.update({ where: { key }, data: { value: row.draftValue as Prisma.InputJsonValue, draftValue: Prisma.DbNull, updatedById: staff.id } });
    await audit({ actorId: staff.id, action: "settings.publish", entityType: "setting", entityId: key });
    revalidatePath("/", "layout");
    return { ok: true, message: "Published to the live store." };
  } catch (e) {
    return fail(e);
  }
}

const courierSchema = z.object({
  code: z.enum(["steadfast", "pathao"]),
  isEnabled: z.boolean(),
  isDefault: z.boolean(),
  mode: z.enum(["MOCK", "SANDBOX", "LIVE"]),
  publicConfig: z.record(z.string(), z.union([z.string(), z.number(), z.null()])),
  // Secrets are write-only: blank values keep the stored secret.
  secrets: z.record(z.string(), z.string().max(500)),
});

export async function saveCourierAction(input: z.infer<typeof courierSchema>): Promise<ActionResult> {
  try {
    const staff = await staffAction("settings.write");
    const d = courierSchema.parse(input);
    if (d.code === "steadfast" && d.mode === "SANDBOX") return { ok: false, error: "Steadfast doesn't offer a public sandbox — use Mock or Live." };
    const row = await db.shippingProvider.findUniqueOrThrow({ where: { code: d.code } });
    const existing = row.encryptedConfig ? decryptJson<Record<string, string>>(row.encryptedConfig) : {};
    const merged = { ...existing };
    for (const [k, v] of Object.entries(d.secrets)) if (v.trim()) merged[k] = v.trim();
    const required = d.code === "steadfast" ? ["apiKey", "secretKey"] : ["clientId", "clientSecret", "username", "password"];
    if (d.mode !== "MOCK" && required.some((k) => !merged[k])) return { ok: false, error: `Enter ${required.join(", ")} to use ${d.mode.toLowerCase()} mode.` };
    if (d.code === "pathao" && d.mode !== "MOCK" && !d.publicConfig.storeId) return { ok: false, error: "Enter your Pathao store ID." };
    await db.$transaction(async (tx) => {
      if (d.isDefault) await tx.shippingProvider.updateMany({ data: { isDefault: false } });
      await tx.shippingProvider.update({
        where: { code: d.code },
        data: {
          isEnabled: d.isEnabled, isDefault: d.isDefault, mode: d.mode, publicConfig: d.publicConfig as Prisma.InputJsonValue,
          encryptedConfig: Object.keys(merged).length ? encryptJson(merged) : null,
          // Changing credentials or environment invalidates any cached OAuth token.
          ...(Object.values(d.secrets).some((v) => v.trim()) || row.mode !== d.mode ? { encryptedToken: null, tokenExpiresAt: null, status: "UNTESTED" } : {}),
        },
      });
    });
    await audit({ actorId: staff.id, action: "courier.update", entityType: "shipping_provider", entityId: d.code, diff: { mode: d.mode, isEnabled: d.isEnabled, publicConfig: d.publicConfig, secretsChanged: Object.keys(d.secrets).filter((k) => d.secrets[k].trim()) } as Prisma.InputJsonValue });
    revalidatePath("/admin/settings/shipping");
    return { ok: true, message: "Courier settings saved." };
  } catch (e) {
    return fail(e);
  }
}

export async function testCourierAction(code: "steadfast" | "pathao"): Promise<ActionResult> {
  try {
    const staff = await staffAction("settings.write");
    const started = Date.now();
    let message: string;
    let ok = false;
    try {
      const { adapter, mode } = await getAdapter(code);
      const r = await adapter.testConnection();
      ok = r.ok;
      message = r.message;
      await db.courierLog.create({ data: { providerCode: code, operation: "test_connection", success: r.ok, mode, durationMs: Date.now() - started } });
    } catch (e) {
      message = (e as Error).message;
      const p = await db.shippingProvider.findUnique({ where: { code } });
      await db.courierLog.create({ data: { providerCode: code, operation: "test_connection", success: false, mode: p?.mode ?? "MOCK", durationMs: Date.now() - started, error: message.slice(0, 1000) } });
    }
    await db.shippingProvider.update({ where: { code }, data: { status: ok ? "CONNECTED" : "ERROR", lastCheckedAt: new Date(), lastError: ok ? null : message.slice(0, 500) } });
    await audit({ actorId: staff.id, action: "courier.test", entityType: "shipping_provider", entityId: code, summary: ok ? "ok" : "failed" });
    revalidatePath("/admin/settings/shipping");
    return ok ? { ok: true, message } : { ok: false, error: message };
  } catch (e) {
    return fail(e);
  }
}

const rateSchema = z.object({ id: z.string().optional(), code: z.string().regex(/^[a-z0-9_]+$/).max(40), name: z.string().min(2).max(60), nameBn: z.string().max(60).optional(), fee: z.coerce.number().min(0).max(5000), etaText: z.string().max(40), districts: z.array(z.string()).max(64), isActive: z.boolean(), sortOrder: z.coerce.number().int() });

export async function saveShippingRateAction(input: z.infer<typeof rateSchema>): Promise<ActionResult> {
  try {
    const staff = await staffAction("settings.write");
    const d = rateSchema.parse(input);
    const data = { code: d.code, name: d.name, nameBn: d.nameBn || null, feeMinor: Math.round(d.fee * 100), etaText: d.etaText, districts: d.districts, isActive: d.isActive, sortOrder: d.sortOrder };
    if (d.id) await db.shippingRate.update({ where: { id: d.id }, data });
    else await db.shippingRate.create({ data });
    await audit({ actorId: staff.id, action: "shipping_rate.save", entityType: "shipping_rate", entityId: d.code, diff: data });
    revalidatePath("/admin/settings/shipping");
    return { ok: true, message: "Delivery rate saved." };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteShippingRateAction(id: string): Promise<ActionResult> {
  try {
    const staff = await staffAction("settings.write");
    await db.shippingRate.delete({ where: { id } });
    await audit({ actorId: staff.id, action: "shipping_rate.delete", entityType: "shipping_rate", entityId: id });
    revalidatePath("/admin/settings/shipping");
    return { ok: true, message: "Rate deleted." };
  } catch (e) {
    return fail(e);
  }
}

export async function saveSecretAction(key: "payments.sslcommerz" | "tryon.google", values: Record<string, string>): Promise<ActionResult> {
  try {
    const staff = await staffAction(key === "tryon.google" ? "tryon.manage" : "settings.write");
    const clean = Object.fromEntries(Object.entries(values).filter(([, v]) => v.trim()).map(([k, v]) => [k, v.trim()]));
    if (!Object.keys(clean).length) return { ok: false, error: "Nothing to save." };
    if (key === "tryon.google") {
      try {
        const sa = JSON.parse(clean.serviceAccountJson ?? "");
        if (!sa.client_email || !sa.private_key) throw new Error();
      } catch {
        return { ok: false, error: "Paste the full service account JSON key (with client_email and private_key)." };
      }
    }
    await setSecret(key, clean, staff.id, Object.values(clean)[0]);
    await audit({ actorId: staff.id, action: "secret.update", entityType: "secret", entityId: key, summary: `updated (${last4(Object.values(clean)[0])})` });
    revalidatePath("/admin", "layout");
    return { ok: true, message: "Credentials saved securely." };
  } catch (e) {
    return fail(e);
  }
}

export async function testTryOnProviderAction(): Promise<ActionResult> {
  try {
    await staffAction("tryon.manage");
    const { resolveProvider } = await import("@/lib/tryon/service");
    const { provider, reason } = await resolveProvider();
    if (!provider.isReal) return { ok: false, error: `Demo mode: ${reason ?? "no AI provider configured"}` };
    // Verify credentials by obtaining an OAuth token (no image generation, no cost).
    const { getSecret } = await import("@/lib/secrets");
    const secret = await getSecret<{ serviceAccountJson: string }>("tryon.google");
    const sa = JSON.parse(secret?.serviceAccountJson ?? process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ?? "{}");
    const { createSign } = await import("node:crypto");
    const now = Math.floor(Date.now() / 1000);
    const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/cloud-platform", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 600 })}`;
    const sig = createSign("RSA-SHA256").update(unsigned).sign(sa.private_key).toString("base64url");
    const res = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${sig}` }), signal: AbortSignal.timeout(15000) });
    if (!res.ok) return { ok: false, error: `Google rejected the service account (HTTP ${res.status}).` };
    return { ok: true, message: `Credentials valid for ${sa.client_email}. Make sure the Vertex AI API is enabled and the model is available in your region.` };
  } catch (e) {
    return fail(e);
  }
}

export async function saveSampleModelAction(fd: FormData): Promise<ActionResult> {
  try {
    const staff = await staffAction("tryon.manage");
    const file = fd.get("file");
    const label = String(fd.get("label") ?? "").trim().slice(0, 40);
    if (!(file instanceof File) || !label) return { ok: false, error: "Add a label and a photo." };
    if (fd.get("rights") !== "on") return { ok: false, error: "Confirm you have the rights and the model's consent to use this photo." };
    const { storeUpload } = await import("./media");
    const asset = await storeUpload(file, "tryon-models", staff.id, label);
    const { getSetting } = await import("@/lib/settings");
    const tryon = await getSetting("tryon");
    const next = { ...tryon, sampleModels: [...tryon.sampleModels, { id: asset.id.slice(-10), label, key: asset.key }].slice(0, 8) };
    const { saveSetting } = await import("@/lib/settings");
    await saveSetting("tryon", next, { actorId: staff.id });
    await audit({ actorId: staff.id, action: "tryon.sample_model.add", entityType: "setting", entityId: "tryon", summary: label });
    revalidatePath("/admin/try-on");
    return { ok: true, message: "Sample model added." };
  } catch (e) {
    return fail(e);
  }
}
