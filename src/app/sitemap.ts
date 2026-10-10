import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { publishedWhere } from "@/lib/catalog/queries";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  const [products, collections] = await Promise.all([
    db.product.findMany({ where: publishedWhere(), select: { slug: true, updatedAt: true } }),
    db.collection.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
  ]);
  const statics = ["", "/shop", "/collections", "/try-on", "/about", "/contact", "/faq", "/shipping-policy", "/return-policy", "/privacy-policy", "/terms"];
  return [
    ...statics.map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.6 })),
    ...collections.map((c) => ({ url: `${base}/collections/${c.slug}`, lastModified: c.updatedAt, priority: 0.7 })),
    ...products.map((p) => ({ url: `${base}/products/${p.slug}`, lastModified: p.updatedAt, priority: 0.8 })),
  ];
}
