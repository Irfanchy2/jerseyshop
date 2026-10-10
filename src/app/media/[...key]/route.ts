import { storage } from "@/lib/storage";

/** Serves public media (key prefix "public/") from local storage. Private keys are never served here. */
export async function GET(_req: Request, ctx: { params: Promise<{ key: string[] }> }) {
  const key = (await ctx.params).key.join("/");
  if (!key.startsWith("public/")) return new Response("Not found", { status: 404 });
  const obj = await storage().get(key).catch(() => null);
  if (!obj) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(obj.body), {
    headers: { "Content-Type": obj.contentType, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
  });
}
