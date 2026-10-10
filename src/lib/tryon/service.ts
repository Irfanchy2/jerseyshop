import "server-only";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getSecret } from "@/lib/secrets";
import { storage, sniffImage } from "@/lib/storage";
import { randomToken, sha256 } from "@/lib/crypto";
import { getCustomer } from "@/lib/auth/session";
import { jerseySvg, type JerseyDesign } from "@/lib/jersey-art";
import { HttpError } from "@/lib/api";
import { PermanentJobError } from "@/lib/jobs/queue";
import { demoProvider } from "./demo";
import { googleVertexProvider } from "./google-vertex";
import { TryOnProviderError, type TryOnProvider } from "./types";

export const TRYON_OWNER_COOKIE = "js_tryon";

/** Returns the configured provider, or the clearly-labelled demo provider when nothing is configured. */
export async function resolveProvider(): Promise<{ provider: TryOnProvider; reason?: string }> {
  const s = (await getSettings()).tryon;
  if (s.provider === "google-vertex") {
    const secret = await getSecret<{ serviceAccountJson: string }>("tryon.google");
    const raw = secret?.serviceAccountJson ?? process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (raw) {
      try {
        const sa = JSON.parse(raw);
        const project = s.googleProject || process.env.GOOGLE_CLOUD_PROJECT || sa.project_id;
        const location = s.googleLocation || process.env.GOOGLE_CLOUD_LOCATION || "us-central1";
        if (sa.client_email && sa.private_key && project) return { provider: googleVertexProvider({ serviceAccount: sa, project, location, model: s.model }) };
        return { provider: demoProvider, reason: "Service account JSON or project ID is incomplete." };
      } catch {
        return { provider: demoProvider, reason: "Service account JSON could not be parsed." };
      }
    }
    return { provider: demoProvider, reason: "Google Cloud credentials are not configured." };
  }
  return { provider: demoProvider, reason: "Demo provider selected." };
}

/** Identify the current try-on owner: account user, or a random guest key in an httpOnly cookie. */
export async function tryOnOwner(create = false) {
  const user = await getCustomer();
  if (user) return { userId: user.id, ownerKeyHash: sha256(`u:${user.id}`) };
  const jar = await cookies();
  let key = jar.get(TRYON_OWNER_COOKIE)?.value;
  if (!key && create) {
    key = randomToken(24);
    jar.set(TRYON_OWNER_COOKIE, key, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });
  }
  return { userId: null, ownerKeyHash: key ? sha256(`g:${key}`) : null };
}

export async function getOwnedJob(id: string) {
  const owner = await tryOnOwner();
  const job = await db.tryOnJob.findUnique({ where: { id }, include: { product: { select: { name: true, slug: true } } } });
  if (!job || job.deletedAt) return null;
  if ((owner.userId && job.userId === owner.userId) || (owner.ownerKeyHash && job.ownerKeyHash === owner.ownerKeyHash)) return job;
  return null;
}

/** Load the flat garment image for a product (rendered art, uploaded media, or https URL). */
export async function loadGarment(product: { slug: string; garmentImageUrl: string | null; design: unknown }) {
  const url = product.garmentImageUrl;
  const sharp = (await import("sharp")).default;
  if ((!url || url.startsWith("/art/jersey/")) && product.design) {
    const svg = jerseySvg(product.design as JerseyDesign, "front", { backdrop: "#ffffff", width: 1024 });
    return { data: await sharp(Buffer.from(svg)).png().toBuffer(), mime: "image/png" };
  }
  if (url?.startsWith("/media/")) {
    const obj = await storage().get(url.replace(/^\/media\//, ""));
    if (obj) return { data: obj.body, mime: obj.contentType };
  }
  const pub = process.env.S3_PUBLIC_BASE_URL;
  if (url && pub && url.startsWith(pub)) {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (res.ok) return { data: Buffer.from(await res.arrayBuffer()), mime: res.headers.get("content-type") ?? "image/png" };
  }
  throw new HttpError(400, "This jersey has no garment image configured for try-on.");
}

/** Validate, sanitise (strip EXIF/GPS, resize) and store an uploaded person photo. */
export async function sanitisePersonPhoto(buf: Buffer, maxMb: number) {
  if (buf.length > maxMb * 1024 * 1024) throw new HttpError(413, `Photo is too large. Maximum ${maxMb} MB.`);
  if (!sniffImage(buf)) throw new HttpError(415, "Please upload a JPG, PNG or WebP photo.");
  const sharp = (await import("sharp")).default;
  const img = sharp(buf, { failOn: "error" }).rotate(); // apply orientation, then metadata is dropped on re-encode
  const meta = await img.metadata();
  if (!meta.width || !meta.height || meta.width < 384 || meta.height < 512) throw new HttpError(400, "Photo resolution is too low. Use a photo at least 512 px tall.");
  return img.resize({ width: 1536, height: 1536, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 90 }).toBuffer();
}

export async function checkLimits(ownerKeyHash: string) {
  const s = (await getSettings()).tryon;
  const since = new Date(Date.now() - 24 * 3600 * 1000);
  const [mine, global, monthCost] = await Promise.all([
    db.tryOnJob.count({ where: { ownerKeyHash, createdAt: { gte: since }, status: { not: "FAILED" } } }),
    db.tryOnJob.count({ where: { createdAt: { gte: since } } }),
    db.aiGenerationRecord.aggregate({ where: { createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } }, _sum: { estimatedCostMicro: true } }),
  ]);
  if (mine >= s.dailyLimitPerUser) throw new HttpError(429, "You've reached today's try-on limit. Please come back tomorrow.", "LIMIT_REACHED");
  if (global >= s.dailyLimitGlobal) throw new HttpError(429, "Virtual try-on is very busy today. Please try again tomorrow.", "LIMIT_REACHED");
  if (s.monthlyBudgetMicroUsd > 0 && (monthCost._sum.estimatedCostMicro ?? 0) >= s.monthlyBudgetMicroUsd)
    throw new HttpError(503, "Virtual try-on is paused for now. Please try again later.", "BUDGET_REACHED");
}

/** Job handler: run the provider and store the result. Retries transient provider errors. */
export async function processTryOnJob(jobId: string) {
  const job = await db.tryOnJob.findUnique({ where: { id: jobId }, include: { product: true } });
  if (!job || job.deletedAt || job.status === "SUCCEEDED" || job.status === "CANCELLED") return;
  await db.tryOnJob.update({ where: { id: jobId }, data: { status: "PROCESSING", startedAt: job.startedAt ?? new Date(), attempts: { increment: 1 } } });
  const { provider } = await resolveProvider();
  const started = Date.now();
  const settings = (await getSettings()).tryon;
  try {
    const personKey = job.personImageKey;
    const person = personKey ? await storage().get(personKey) : null;
    if (!person) throw new TryOnProviderError("INVALID_INPUT", "Person image missing (expired or deleted)", false);
    const garment = await loadGarment(job.product);
    const out = await provider.generate({ person: { data: person.body, mime: person.contentType }, garment });
    const resultKey = `tryon/${job.id}/result.${out.mime === "image/png" ? "png" : "jpg"}`;
    await storage().put(resultKey, out.data, out.mime);
    await db.$transaction([
      db.tryOnJob.update({ where: { id: jobId }, data: { status: "SUCCEEDED", resultImageKey: resultKey, completedAt: new Date(), isDemo: out.demo, provider: provider.id, errorCode: null, errorMessage: null } }),
      db.aiGenerationRecord.create({
        data: { jobId, provider: provider.id, model: out.model, success: true, latencyMs: Date.now() - started, estimatedCostMicro: provider.isReal ? settings.estimatedCostPerImageMicroUsd : 0 },
      }),
    ]);
  } catch (e) {
    const err = e instanceof TryOnProviderError ? e : new TryOnProviderError("PROVIDER_ERROR", (e as Error).message, true);
    await db.aiGenerationRecord.create({ data: { jobId, provider: provider.id, success: false, latencyMs: Date.now() - started, error: `${err.code}: ${err.message}`.slice(0, 500) } });
    const lastAttempt = !err.retryable || job.attempts + 1 >= 3;
    await db.tryOnJob.update({
      where: { id: jobId },
      data: lastAttempt ? { status: "FAILED", errorCode: err.code, errorMessage: err.message.slice(0, 500), completedAt: new Date() } : { status: "QUEUED", errorCode: err.code },
    });
    if (lastAttempt) throw new PermanentJobError(err.message);
    throw err;
  }
}

export async function deleteTryOnJobMedia(jobId: string) {
  const job = await db.tryOnJob.findUnique({ where: { id: jobId } });
  if (!job) return;
  for (const key of [job.personImageKey, job.resultImageKey]) if (key && key.startsWith("tryon/")) await storage().delete(key).catch(() => {});
  await db.tryOnJob.update({ where: { id: jobId }, data: { personImageKey: null, resultImageKey: null, deletedAt: new Date(), status: job.status === "PROCESSING" || job.status === "QUEUED" ? "CANCELLED" : job.status } });
}

/** Retention: delete expired try-on images (person + result). Saved-to-account images are kept until the customer deletes them. */
export async function purgeExpiredTryOns() {
  const expired = await db.tryOnJob.findMany({ where: { deletedAt: null, retainUntil: { lt: new Date() }, saveToAccount: false }, select: { id: true }, take: 500 });
  for (const j of expired) await deleteTryOnJobMedia(j.id);
  return expired.length;
}
