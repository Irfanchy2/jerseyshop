import { after } from "next/server";
import { db } from "@/lib/db";
import { json, route, HttpError } from "@/lib/api";
import { getSettings } from "@/lib/settings";
import { storage } from "@/lib/storage";
import { clientIp } from "@/lib/auth/session";
import { hashIp } from "@/lib/crypto";
import { rateLimit } from "@/lib/rate-limit";
import { enqueue, runJobNow } from "@/lib/jobs/queue";
import { checkLimits, resolveProvider, sanitisePersonPhoto, tryOnOwner } from "@/lib/tryon/service";
import { track } from "@/lib/analytics";

export const maxDuration = 120;

/** Create a try-on job: consent + validated photo (or a merchant sample model) + a try-on enabled product. */
export const POST = route(async (req) => {
  const settings = (await getSettings()).tryon;
  if (!settings.enabled) throw new HttpError(503, "Virtual try-on is currently unavailable.");
  const ip = await clientIp();
  if (!(await rateLimit(`tryon:${ip}`, 12, 3600))) throw new HttpError(429, "Too many try-on requests. Please wait a while.");

  const fd = await req.formData();
  if (fd.get("consent") !== "true") throw new HttpError(400, "Please agree to the photo processing terms to continue.", "CONSENT_REQUIRED");
  const productId = String(fd.get("productId") ?? "");
  const product = await db.product.findFirst({ where: { id: productId, status: "ACTIVE", tryOnEnabled: true } });
  if (!product) throw new HttpError(404, "This jersey isn't available for virtual try-on.");

  const owner = await tryOnOwner(true);
  await checkLimits(owner.ownerKeyHash!);

  let photo: Buffer;
  let usedSample = false;
  const sampleId = fd.get("sampleModelId");
  if (sampleId) {
    const model = settings.sampleModels.find((m) => m.id === sampleId);
    const obj = model ? await storage().get(model.key) : null;
    if (!obj) throw new HttpError(404, "Sample model not found.");
    photo = obj.body;
    usedSample = true;
  } else {
    const file = fd.get("photo");
    if (!(file instanceof File) || file.size === 0) throw new HttpError(400, "Please upload a photo.");
    photo = await sanitisePersonPhoto(Buffer.from(await file.arrayBuffer()), settings.maxUploadMb);
  }

  const { provider } = await resolveProvider();
  const saveToAccount = fd.get("saveToAccount") === "true" && !!owner.userId;
  const job = await db.tryOnJob.create({
    data: {
      userId: owner.userId, ownerKeyHash: owner.ownerKeyHash!, productId: product.id, provider: provider.id, isDemo: !provider.isReal,
      usedSampleModel: usedSample, garmentImageRef: product.garmentImageUrl ?? `/art/jersey/${product.slug}/garment.png`,
      consentAt: new Date(), consentVersion: settings.consentVersion, saveToAccount,
      retainUntil: new Date(Date.now() + settings.retentionHours * 3600 * 1000), ipHash: hashIp(ip),
    },
  });
  const personKey = `tryon/${job.id}/person.jpg`;
  await storage().put(personKey, photo, "image/jpeg");
  await db.tryOnJob.update({ where: { id: job.id }, data: { personImageKey: personKey } });
  const queued = await enqueue("tryon.generate", { tryOnJobId: job.id }, { dedupeKey: `tryon:${job.id}`, maxAttempts: 3 });
  // Process right after responding; the cron worker retries anything left pending.
  after(() => runJobNow(queued.id));
  await track("tryon_generate", { productId: product.id, userId: owner.userId, props: { demo: !provider.isReal, sample: usedSample } });
  return json({ id: job.id, status: "QUEUED", demo: !provider.isReal }, 202);
});
