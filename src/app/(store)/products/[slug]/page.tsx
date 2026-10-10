import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getProductDetail, getProductList } from "@/lib/catalog/queries";
import { effectivePrice } from "@/lib/catalog/pricing";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { getSettings } from "@/lib/settings";
import { toMajorString } from "@/lib/money";
import { Gallery } from "@/components/store/product/gallery";
import { PurchasePanel } from "@/components/store/product/purchase-panel";
import { ProductRail } from "@/components/store/home/product-rail";
import { RecentlyViewed } from "@/components/store/home/recently-viewed";
import { ProductReviews } from "@/components/store/product/reviews";
import type { JerseyDesign } from "@/lib/jersey-art";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getProductDetail((await params).slug);
  if (!p) return {};
  const desc = p.seoDescription ?? p.description.slice(0, 160);
  return {
    title: p.seoTitle ?? p.name,
    description: desc,
    alternates: { canonical: `/products/${p.slug}` },
    openGraph: { title: p.name, description: desc, type: "website", images: p.images[0] ? [{ url: p.images[0].url.replace(".svg", ".svg") }] : [] },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const [p, t, locale, settings] = await Promise.all([getProductDetail(slug), getDictionary(), getLocale(), getSettings()]);
  if (!p) notFound();
  const price = effectivePrice(p);
  const rates = await db.shippingRate.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
  const ratingAgg = await db.review.aggregate({ where: { productId: p.id, status: "APPROVED" }, _avg: { rating: true }, _count: true });
  const related = await getProductList(
    { where: { id: { not: p.id }, OR: [{ teamId: p.teamId ?? undefined }, { categoryId: p.categoryId }] }, take: 8 },
    locale,
  );
  const name = locale === "bn" && p.nameBn ? p.nameBn : p.name;
  const base = process.env.APP_URL ?? "http://localhost:3000";
  const inStock = p.variants.some((v) => v.stock > 0);

  // Structured data (schema.org Product). Ratings are included only when real approved reviews exist.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description,
    sku: p.variants[0]?.sku,
    image: p.images.map((i) => `${base}${i.url}`),
    brand: { "@type": "Brand", name: settings.brand.name },
    offers: {
      "@type": "Offer",
      url: `${base}/products/${p.slug}`,
      priceCurrency: "BDT",
      price: toMajorString(price.price),
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
    ...(ratingAgg._count > 0 ? { aggregateRating: { "@type": "AggregateRating", ratingValue: (ratingAgg._avg.rating ?? 0).toFixed(1), reviewCount: ratingAgg._count } } : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="container-x pt-4 md:pt-8">
        <div className="grid gap-8 lg:grid-cols-[1.25fr_1fr] lg:gap-14">
          <Gallery images={p.images.map((i) => ({ url: i.url, alt: i.alt, kind: i.kind }))} name={name} design={p.design as unknown as JerseyDesign | null} has3d={!!p.design || !!p.model3dUrl} />
          <PurchasePanel
            p={{
              id: p.id, slug: p.slug, name, teamName: p.team?.name ?? null, categoryName: locale === "bn" && p.category.nameBn ? p.category.nameBn : p.category.name,
              season: p.season, description: locale === "bn" && p.descriptionBn ? p.descriptionBn : p.description, fabric: p.fabric, care: p.care, fit: p.fit,
              price: price.price, original: price.original, percentOff: price.percentOff,
              variants: p.variants.map((v) => ({ id: v.id, size: v.size, color: v.color, colorHex: v.colorHex, stock: v.stock, lowStockThreshold: v.lowStockThreshold })),
              tryOnEnabled: p.tryOnEnabled && settings.tryon.enabled, customizable: p.customizable && !!p.template?.isActive, customizationPrice: p.template?.priceMinor ?? null,
              rating: { avg: ratingAgg._avg.rating ?? 0, count: ratingAgg._count },
            }}
            delivery={{
              processing: settings.delivery.processingDaysText,
              returnDays: settings.delivery.returnPolicyDays,
              rates: rates.map((r) => ({ name: locale === "bn" && r.nameBn ? r.nameBn : r.name, fee: r.feeMinor, eta: r.etaText })),
              freeThreshold: settings.delivery.freeShippingThresholdMinor,
            }}
          />
        </div>
      </div>
      <ProductReviews
        title={t.product.reviews}
        empty={t.product.noReviews}
        verified={t.product.verifiedBuyer}
        avg={ratingAgg._avg.rating ?? 0}
        reviews={p.reviews.map((r) => ({ id: r.id, rating: r.rating, title: r.title, body: r.body, author: r.user.name.split(" ")[0], date: r.createdAt.toISOString(), verified: !!r.orderItemId }))}
        productId={p.id}
      />
      <ProductRail title={t.product.related} items={related} />
      <RecentlyViewed excludeId={p.id} />
    </>
  );
}
