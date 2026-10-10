import { db } from "@/lib/db";
import { jerseySvg, type JerseyDesign } from "@/lib/jersey-art";

/**
 * Serves original catalog artwork rendered from a product's design spec:
 *   /art/jersey/:slug/front.svg | back.svg   — catalog images
 *   /art/jersey/:slug/garment.png            — flat garment image (white background) for the try-on provider
 */
export async function GET(req: Request, ctx: { params: Promise<{ slug: string; view: string }> }) {
  const { slug, view } = await ctx.params;
  const product = await db.product.findUnique({ where: { slug }, select: { design: true, updatedAt: true } });
  if (!product?.design) return new Response("Not found", { status: 404 });
  const design = product.design as unknown as JerseyDesign;
  const url = new URL(req.url);
  const bg = url.searchParams.get("bg");
  const backdrop = bg === "none" ? null : bg && /^[0-9a-fA-F]{6}$/.test(bg) ? `#${bg}` : undefined;
  const etag = `"${product.updatedAt.getTime()}-${view}-${bg ?? ""}"`;
  if (req.headers.get("if-none-match") === etag) return new Response(null, { status: 304 });
  const headers = { ETag: etag, "Cache-Control": "public, max-age=300, stale-while-revalidate=86400" };

  if (view === "front.svg" || view === "back.svg") {
    const svg = jerseySvg(design, view === "front.svg" ? "front" : "back", { backdrop });
    return new Response(svg, { headers: { ...headers, "Content-Type": "image/svg+xml; charset=utf-8" } });
  }
  if (view === "garment.png") {
    const sharp = (await import("sharp")).default;
    const svg = jerseySvg(design, "front", { backdrop: "#ffffff", width: 1024 });
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    return new Response(new Uint8Array(png), { headers: { ...headers, "Content-Type": "image/png" } });
  }
  return new Response("Not found", { status: 404 });
}
