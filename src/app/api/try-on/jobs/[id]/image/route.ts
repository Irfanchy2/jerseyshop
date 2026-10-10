import { getOwnedJob } from "@/lib/tryon/service";
import { storage } from "@/lib/storage";

/** Private image access — only the job owner, never cached by shared caches. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const job = await getOwnedJob((await ctx.params).id);
  const kind = new URL(req.url).searchParams.get("kind");
  const key = kind === "person" ? job?.personImageKey : job?.resultImageKey;
  if (!job || !key) return new Response("Not found", { status: 404 });
  const obj = await storage().get(key);
  if (!obj) return new Response("Not found", { status: 404 });
  const download = new URL(req.url).searchParams.get("download") === "1";
  return new Response(new Uint8Array(obj.body), {
    headers: {
      "Content-Type": obj.contentType,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      ...(download ? { "Content-Disposition": `attachment; filename="tryon-${job.product.slug}${job.isDemo ? "-DEMO" : "-AI-preview"}.${obj.contentType === "image/png" ? "png" : "jpg"}"` } : {}),
    },
  });
}
