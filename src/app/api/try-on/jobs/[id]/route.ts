import { json, route, HttpError } from "@/lib/api";
import { deleteTryOnJobMedia, getOwnedJob } from "@/lib/tryon/service";
import { CUSTOMER_MESSAGES } from "@/lib/tryon/types";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_req, { params }) => {
  const job = await getOwnedJob((await params).id);
  if (!job) throw new HttpError(404, "Not found");
  return json({
    id: job.id,
    status: job.status,
    demo: job.isDemo,
    product: job.product,
    error: job.status === "FAILED" ? CUSTOMER_MESSAGES[job.errorCode ?? "PROVIDER_ERROR"] ?? CUSTOMER_MESSAGES.PROVIDER_ERROR : null,
    retrying: job.status === "QUEUED" && !!job.errorCode,
    resultUrl: job.resultImageKey ? `/api/try-on/jobs/${job.id}/image?kind=result` : null,
    personUrl: job.personImageKey ? `/api/try-on/jobs/${job.id}/image?kind=person` : null,
    retainUntil: job.retainUntil,
    saveToAccount: job.saveToAccount,
  });
});

export const DELETE = route<Ctx>(async (_req, { params }) => {
  const job = await getOwnedJob((await params).id);
  if (!job) throw new HttpError(404, "Not found");
  await deleteTryOnJobMedia(job.id);
  return json({ ok: true });
});
