import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { effectivePrice } from "./pricing";

import { SIZE_ORDER } from "./sizes";

export { SIZE_ORDER };

export const productCardInclude = {
  images: { orderBy: { sortOrder: "asc" }, take: 2 },
  variants: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
  team: true,
  category: true,
  reviews: { where: { status: "APPROVED" }, select: { rating: true } },
} satisfies Prisma.ProductInclude;

export type ProductCardData = Prisma.ProductGetPayload<{ include: typeof productCardInclude }>;

/** Serialisable card model passed to client components. */
export function toCard(p: ProductCardData, locale = "en") {
  const price = effectivePrice(p);
  const sizes = [...new Set(p.variants.map((v) => v.size))].sort((a, b) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b));
  const colors = [...new Map(p.variants.map((v) => [v.color, v.colorHex])).entries()].map(([name, hex]) => ({ name, hex }));
  const ratingCount = p.reviews.length;
  const rating = ratingCount ? Math.round((p.reviews.reduce((a, r) => a + r.rating, 0) / ratingCount) * 10) / 10 : null;
  const isNew = p.publishedAt ? Date.now() - new Date(p.publishedAt).getTime() < 1000 * 3600 * 24 * 30 : false;
  return {
    id: p.id,
    slug: p.slug,
    name: locale === "bn" && p.nameBn ? p.nameBn : p.name,
    teamName: p.team?.name ?? null,
    categoryName: p.category.name,
    season: p.season,
    image: p.images[0]?.url ?? null,
    hoverImage: p.images[1]?.url ?? null,
    price: price.price,
    original: price.original,
    percentOff: price.percentOff,
    sizes,
    colors,
    variants: p.variants.map((v) => ({ id: v.id, size: v.size, color: v.color, stock: v.stock })),
    inStock: p.variants.some((v) => v.stock > 0),
    isNew,
    customizable: p.customizable,
    tryOnEnabled: p.tryOnEnabled,
    rating,
    ratingCount,
  };
}
export type ProductCard = ReturnType<typeof toCard>;

export type CatalogFilters = {
  q?: string;
  category?: string;
  collection?: string;
  teams?: string[];
  seasons?: string[];
  colors?: string[];
  sizes?: string[];
  kits?: string[];
  minPrice?: number; // minor units
  maxPrice?: number;
  inStock?: boolean;
  onSale?: boolean;
  sort?: "featured" | "newest" | "price-asc" | "price-desc" | "best";
  page?: number;
  perPage?: number;
};

export function parseFilters(sp: Record<string, string | string[] | undefined>): CatalogFilters {
  const list = (k: string) => {
    const v = sp[k];
    const arr = Array.isArray(v) ? v : v ? v.split(",") : [];
    return arr.map((s) => s.trim()).filter(Boolean).slice(0, 20);
  };
  const num = (k: string) => {
    const v = Number(sp[k]);
    return Number.isFinite(v) && v >= 0 ? Math.round(v * 100) : undefined;
  };
  const sort = String(sp.sort ?? "featured");
  return {
    q: typeof sp.q === "string" ? sp.q.slice(0, 80) : undefined,
    category: typeof sp.category === "string" ? sp.category : undefined,
    teams: list("team"),
    seasons: list("season"),
    colors: list("color"),
    sizes: list("size"),
    kits: list("kit"),
    minPrice: num("min"),
    maxPrice: num("max"),
    inStock: sp.stock === "1",
    onSale: sp.sale === "1",
    sort: (["featured", "newest", "price-asc", "price-desc", "best"].includes(sort) ? sort : "featured") as CatalogFilters["sort"],
    page: Math.max(1, Number(sp.page) || 1),
  };
}

export const publishedWhere = (): Prisma.ProductWhereInput => ({
  status: "ACTIVE",
  OR: [{ publishedAt: null }, { publishedAt: { lte: new Date() } }],
});

async function salesByProduct(): Promise<Map<string, number>> {
  const rows = await db.orderItem.groupBy({
    by: ["productId"],
    where: { order: { status: { notIn: ["CANCELLED"] } }, productId: { not: null } },
    _sum: { quantity: true },
  });
  return new Map(rows.map((r) => [r.productId!, r._sum.quantity ?? 0]));
}

export async function searchCatalog(f: CatalogFilters, locale = "en") {
  const perPage = f.perPage ?? 24;
  const variantConds: Prisma.ProductVariantWhereInput = { isActive: true };
  if (f.sizes?.length) variantConds.size = { in: f.sizes };
  if (f.colors?.length) variantConds.color = { in: f.colors };
  if (f.inStock) variantConds.stock = { gt: 0 };

  const where: Prisma.ProductWhereInput = {
    AND: [
      publishedWhere(),
      f.category ? { category: { slug: f.category } } : {},
      f.collection ? { collections: { some: { collection: { slug: f.collection } } } } : {},
      f.teams?.length ? { team: { slug: { in: f.teams } } } : {},
      f.seasons?.length ? { season: { in: f.seasons } } : {},
      f.kits?.length ? { kitType: { in: f.kits as Prisma.EnumKitTypeFilter["in"] } } : {},
      f.sizes?.length || f.colors?.length || f.inStock ? { variants: { some: variantConds } } : {},
      f.q
        ? {
            OR: [
              { name: { contains: f.q, mode: "insensitive" } },
              { nameBn: { contains: f.q, mode: "insensitive" } },
              { tags: { has: f.q.toLowerCase() } },
              { team: { name: { contains: f.q, mode: "insensitive" } } },
              { season: { contains: f.q, mode: "insensitive" } },
            ],
          }
        : {},
    ],
  };

  // Price depends on scheduled promotions, so price filtering/sorting is computed on a slim projection.
  const slim = await db.product.findMany({
    where,
    select: {
      id: true, priceMinor: true, compareAtMinor: true, salePriceMinor: true, saleStartsAt: true, saleEndsAt: true,
      isFeatured: true, isBestSeller: true, createdAt: true, publishedAt: true,
    },
  });
  let rows = slim.map((p) => { const e = effectivePrice(p); return { ...p, eff: e.price, discounted: e.original != null }; });
  if (f.onSale) rows = rows.filter((r) => r.discounted);
  if (f.minPrice != null) rows = rows.filter((r) => r.eff >= f.minPrice!);
  if (f.maxPrice != null) rows = rows.filter((r) => r.eff <= f.maxPrice!);

  const sales = f.sort === "best" || f.sort === "featured" ? await salesByProduct() : new Map<string, number>();
  const time = (r: (typeof rows)[number]) => (r.publishedAt ?? r.createdAt).getTime();
  rows.sort((a, b) => {
    switch (f.sort) {
      case "newest": return time(b) - time(a);
      case "price-asc": return a.eff - b.eff;
      case "price-desc": return b.eff - a.eff;
      case "best": return (sales.get(b.id) ?? 0) - (sales.get(a.id) ?? 0) || time(b) - time(a);
      default:
        return Number(b.isFeatured) - Number(a.isFeatured) || Number(b.isBestSeller) - Number(a.isBestSeller) || (sales.get(b.id) ?? 0) - (sales.get(a.id) ?? 0) || time(b) - time(a);
    }
  });

  const total = rows.length;
  const page = Math.min(f.page ?? 1, Math.max(1, Math.ceil(total / perPage)));
  const ids = rows.slice((page - 1) * perPage, page * perPage).map((r) => r.id);
  const products = await db.product.findMany({ where: { id: { in: ids } }, include: productCardInclude });
  const byId = new Map(products.map((p) => [p.id, p]));
  return {
    total,
    page,
    pages: Math.max(1, Math.ceil(total / perPage)),
    items: ids.map((id) => byId.get(id)!).filter(Boolean).map((p) => toCard(p, locale)),
  };
}

/** Facet values for the filter UI, derived from live published products. */
export async function catalogFacets() {
  const [categories, teams, seasons, variants, prices] = await Promise.all([
    db.category.findMany({ where: { isActive: true, products: { some: publishedWhere() } }, orderBy: { sortOrder: "asc" } }),
    db.team.findMany({ where: { products: { some: publishedWhere() } }, orderBy: [{ kind: "asc" }, { name: "asc" }] }),
    db.product.findMany({ where: { ...publishedWhere(), season: { not: null } }, distinct: ["season"], select: { season: true } }),
    db.productVariant.findMany({ where: { isActive: true, product: publishedWhere() }, distinct: ["size", "color"], select: { size: true, color: true, colorHex: true } }),
    db.product.aggregate({ where: publishedWhere(), _min: { priceMinor: true }, _max: { priceMinor: true } }),
  ]);
  const sizes = [...new Set(variants.map((v) => v.size))].sort((a, b) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b));
  const colors = [...new Map(variants.map((v) => [v.color, v.colorHex])).entries()].map(([name, hex]) => ({ name, hex }));
  return {
    categories: categories.map((c) => ({ slug: c.slug, name: c.name, nameBn: c.nameBn })),
    teams: teams.map((t) => ({ slug: t.slug, name: t.name, kind: t.kind })),
    seasons: seasons.map((s) => s.season!).sort().reverse(),
    sizes,
    colors,
    priceRange: { min: prices._min.priceMinor ?? 0, max: prices._max.priceMinor ?? 0 },
  };
}

export async function getProductsByIds(ids: string[], locale = "en") {
  if (!ids.length) return [];
  const products = await db.product.findMany({ where: { id: { in: ids }, ...publishedWhere() }, include: productCardInclude });
  const byId = new Map(products.map((p) => [p.id, p]));
  return ids.map((id) => byId.get(id)).filter(Boolean).map((p) => toCard(p!, locale));
}

export async function getProductList(opts: { where?: Prisma.ProductWhereInput; take?: number; orderBy?: Prisma.ProductOrderByWithRelationInput[] }, locale = "en") {
  const products = await db.product.findMany({
    where: { AND: [publishedWhere(), opts.where ?? {}] },
    include: productCardInclude,
    take: opts.take ?? 8,
    orderBy: opts.orderBy ?? [{ isFeatured: "desc" }, { createdAt: "desc" }],
  });
  return products.map((p) => toCard(p, locale));
}

export async function getBestSellers(take = 8, locale = "en") {
  const sales = await salesByProduct();
  const ranked = [...sales.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
  const top = await getProductsByIds(ranked.slice(0, take * 2), locale);
  if (top.length >= take) return top.slice(0, take);
  // Fall back to products the merchant flagged as best sellers when there is little order history.
  const flagged = await getProductList({ where: { isBestSeller: true, id: { notIn: top.map((t) => t.id) } }, take: take - top.length }, locale);
  return [...top, ...flagged];
}

export async function getProductDetail(slug: string) {
  return db.product.findFirst({
    where: { slug, ...publishedWhere() },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
      team: true,
      category: true,
      template: true,
      collections: { include: { collection: true } },
      reviews: { where: { status: "APPROVED" }, include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
}
