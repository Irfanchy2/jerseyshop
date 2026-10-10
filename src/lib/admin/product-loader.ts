import "server-only";
import { db } from "@/lib/db";
import type { ProductInput } from "./catalog-actions";

const local = (d: Date | null) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : null);
const major = (m: number | null) => (m == null ? null : m / 100);

export async function loadProductForm(id?: string) {
  const [categories, teams, collections, templates] = await Promise.all([
    db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    db.team.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.collection.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    db.customizationTemplate.findMany({ where: { isActive: true }, select: { id: true, name: true, priceMinor: true } }),
  ]);
  let initial: ProductInput & { id?: string };
  if (id) {
    const p = await db.product.findUnique({ where: { id }, include: { images: { orderBy: { sortOrder: "asc" } }, variants: { orderBy: { sortOrder: "asc" } }, collections: true } });
    if (!p) return null;
    initial = {
      id: p.id, name: p.name, nameBn: p.nameBn ?? "", slug: p.slug, description: p.description, descriptionBn: p.descriptionBn ?? "", status: p.status,
      categoryId: p.categoryId, teamId: p.teamId ?? "", season: p.season ?? "", kitType: p.kitType, price: p.priceMinor / 100, compareAt: major(p.compareAtMinor),
      salePrice: major(p.salePriceMinor), saleStartsAt: local(p.saleStartsAt), saleEndsAt: local(p.saleEndsAt), fabric: p.fabric ?? "", care: p.care ?? "", fit: p.fit ?? "",
      tags: p.tags, isFeatured: p.isFeatured, isBestSeller: p.isBestSeller, tryOnEnabled: p.tryOnEnabled, garmentImageUrl: p.garmentImageUrl, customizable: p.customizable,
      templateId: p.templateId, model3dUrl: p.model3dUrl, seoTitle: p.seoTitle ?? "", seoDescription: p.seoDescription ?? "", publishedAt: local(p.publishedAt),
      collectionIds: p.collections.map((c) => c.collectionId), design: (p.design as ProductInput["design"]) ?? null,
      images: p.images.map((i) => ({ url: i.url, alt: i.alt ?? "", kind: i.kind })),
      variants: p.variants.map((v) => ({ id: v.id, size: v.size, color: v.color, colorHex: v.colorHex, sku: v.sku, price: major(v.priceMinor), stock: v.stock, lowStockThreshold: v.lowStockThreshold, isActive: v.isActive })),
    };
  } else {
    initial = {
      name: "", nameBn: "", slug: "", description: "", descriptionBn: "", status: "DRAFT", categoryId: categories[0]?.id ?? "", teamId: "", season: "", kitType: "HOME",
      price: 0, compareAt: null, salePrice: null, saleStartsAt: null, saleEndsAt: null, fabric: "100% recycled polyester performance knit", care: "Machine wash cold inside out. Do not iron prints.", fit: "",
      tags: [], isFeatured: false, isBestSeller: false, tryOnEnabled: false, garmentImageUrl: null, customizable: false, templateId: templates[0]?.id ?? null, model3dUrl: null,
      seoTitle: "", seoDescription: "", publishedAt: null, collectionIds: [], design: { pattern: "plain", base: "#1f2937", secondary: "#ffffff", trim: "#ffffff", collar: "crew", crest: null }, images: [], variants: [],
    };
  }
  return { initial, categories, teams, collections, templates: templates.map((t) => ({ id: t.id, name: t.name, price: t.priceMinor })) };
}
