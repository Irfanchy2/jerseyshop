import { after } from "next/server";
import { db } from "@/lib/db";
import { json, route, HttpError } from "@/lib/api";
import { storage } from "@/lib/storage";
import { getSettings } from "@/lib/settings";
import { enqueue, runJobNow } from "@/lib/jobs/queue";
import { checkLimits, getOwnedJob, resolveProvider } from "@/lib/tryon/service";

/** Generate again with the same (still-retained) photo, optionally for a different jersey. */
export const POST = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const prev = await getOwnedJob((await params).id);
  if (!prev?.personImageKey) throw new HttpError(404, "The original photo is no longer available. Please upload it again.");
  const body = await req.json().catch(() => ({}));
  const productId = typeof body.productId === "string" ? body.productId : prev.productId;
  const product = await db.product.findFirst({ where: { id: productId, status: "ACTIVE", tryOnEnabled: true } });
  if (!product) throw new HttpError(404, "This jersey isn't available for virtual try-on.");
  await checkLimits(prev.ownerKeyHash);
  const person = await storage().get(prev.personImageKey);
  if (!person) throw new HttpError(404, "The original photo is no longer available.");
  const settings = (await getSettings()).tryon;
  const { provider } = await resolveProvider();
  const job = await db.tryOnJob.create({
    data: {
      userId: prev.userId, ownerKeyHash: prev.ownerKeyHash, productId, provider: provider.id, isDemo: !provider.isReal, usedSampleModel: prev.usedSampleModel,
      garmentImageRef: product.garmentImageUrl ?? `/art/jersey/${product.slug}/garment.png`, consentAt: prev.consentAt, consentVersion: prev.consentVersion,
      saveToAccount: prev.saveToAccount, retainUntil: new Date(Date.now() + settings.retentionHours * 3600 * 1000), ipHash: prev.ipHash,
    },
  });
  const key = `tryon/${job.id}/person.jpg`;
  await storage().put(key, person.body, person.contentType);
  await db.tryOnJob.update({ where: { id: job.id }, data: { personImageKey: key } });
  const queued = await enqueue("tryon.generate", { tryOnJobId: job.id }, { dedupeKey: `tryon:${job.id}` });
  after(() => runJobNow(queued.id));
  return json({ id: job.id, status: "QUEUED", demo: !provider.isReal }, 202);
});
