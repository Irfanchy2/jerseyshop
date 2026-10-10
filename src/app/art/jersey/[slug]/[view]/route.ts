import { db } from "@/lib/db";
import { jerseySvg, type JerseyDesign } from "@/lib/jersey-art";
import { ART_WIDTHS } from "@/lib/images";

/**
 * Original catalog artwork rendered from a product's design spec:
 *   /art/jersey/:slug/front.svg | back.svg            — vector source
 *   /art/jersey/:slug/front.webp?w=640[&bg=none]      — cached raster used by the storefront
 *   /art/jersey/:slug/garment.png                      — flat garment image for the try-on provider
 */
const cache = new Map<string, Buffer>();
const MAX_CACHE = 400;

export async function GET(req: Request, ctx: { params: Promise<{ slug: string; view: string }> }) {
  const { slug, view } = await ctx.params;
  const product = await db.product.findUnique({ where: { slug }, select: { design: true, updatedAt: true } });
  if (!product?.design) return new Response("Not found", { status: 404 });
  const design = product.design as unknown as JerseyDesign;
  const url = new URL(req.url);
  const bg = url.searchParams.get("bg");
  const backdrop = bg === "none" ? null : bg && /^[0-9a-fA-F]{6}$/.test(bg) ? `#${bg}` : undefined;
  const width = ART_WIDTHS.find((w) => w === Number(url.searchParams.get("w"))) ?? 640;
  const etag = `"${product.updatedAt.getTime()}-${view}-${bg ?? ""}-${width}"`;
  if (req.headers.get("if-none-match") === etag) return new Response(null, { status: 304 });
  const headers = { ETag: etag, "Cache-Control": "public, max-age=3600, stale-while-revalidate=604800" };

  const m = view.match(/^(front|back)\.(svg|webp)$/);
  if (m) {
    const side = m[1] as "front" | "back";
    if (m[2] === "svg") return new Response(jerseySvg(design, side, { backdrop }), { headers: { ...headers, "Content-Type": "image/svg+xml; charset=utf-8" } });
    let buf = cache.get(etag);
    if (!buf) {
      const sharp = (await import("sharp")).default;
      buf = await sharp(Buffer.from(jerseySvg(design, side, { backdrop, width })), { density: 96 }).webp({ quality: 82, alphaQuality: 90 }).toBuffer();
      if (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value!);
      cache.set(etag, buf);
    }
    return new Response(new Uint8Array(buf), { headers: { ...headers, "Content-Type": "image/webp" } });
  }
  if (view === "garment.png") {
    const sharp = (await import("sharp")).default;
    const png = await sharp(Buffer.from(jerseySvg(design, "front", { backdrop: "#ffffff", width: 1024 }))).png().toBuffer();
    return new Response(new Uint8Array(png), { headers: { ...headers, "Content-Type": "image/png" } });
  }
  return new Response("Not found", { status: 404 });
}
