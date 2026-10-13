import { db } from "@/lib/db";
import { parseSection, type SectionContent, type SectionType } from "@/lib/cms/sections";
import { getBestSellers, getProductList, publishedWhere } from "@/lib/catalog/queries";
import { effectivePrice } from "@/lib/catalog/pricing";
import type { Dictionary, Locale } from "@/lib/i18n/dictionaries";
import type { JerseyDesign } from "@/lib/jersey-art";
import { Hero } from "./hero";
import { CategoryCards } from "./category-cards";
import { ProductRail } from "./product-rail";
import { FeaturedCollections } from "./featured-collections";
import { PersonalisePromo } from "./personalise-promo";
import { ClubNational } from "./club-national";
import { TryOnPromo } from "./tryon-promo";
import { Trust } from "./trust";
import { Reviews } from "./reviews";
import { RecentlyViewed } from "./recently-viewed";
import { NewsletterBlock } from "./newsletter-block";
import { EditorialBanner } from "./editorial-banner";
import { Edits } from "./edits";

export type RenderableSection = { id: string; type: string; content: unknown };

async function imagesBySlug(slugs: string[]) {
  if (!slugs.length) return {} as Record<string, string | null>;
  const rows = await db.product.findMany({ where: { slug: { in: slugs } }, select: { slug: true, images: { orderBy: { sortOrder: "asc" }, take: 1 } } });
  return Object.fromEntries(rows.map((r) => [r.slug, r.images[0]?.url ?? null]));
}

async function maxLiveDiscount() {
  const rows = await db.product.findMany({
    where: { ...publishedWhere(), OR: [{ salePriceMinor: { not: null } }, { compareAtMinor: { not: null } }] },
    select: { priceMinor: true, compareAtMinor: true, salePriceMinor: true, saleStartsAt: true, saleEndsAt: true },
  });
  return rows.reduce((m, p) => Math.max(m, effectivePrice(p).percentOff), 0);
}

async function Section({ s, t, locale }: { s: RenderableSection; t: Dictionary; locale: Locale }) {
  const c = parseSection(s.type, s.content);
  if (!c) return null;
  const L = (en: string, bn?: string) => (locale === "bn" && bn ? bn : en);
  switch (s.type as SectionType) {
    case "hero": {
      const hc = c as SectionContent<"hero">;
      const products = await db.product.findMany({
        where: { slug: { in: hc.featuredProductSlugs }, ...publishedWhere() },
        include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, team: true },
      });
      const picked = hc.featuredProductSlugs.map((slug) => products.find((p) => p.slug === slug)).filter(Boolean) as typeof products;
      // Keep the rack full even if some picks were unpublished.
      if (picked.length < 7) {
        picked.push(
          ...(await db.product.findMany({
            where: { ...publishedWhere(), slug: { notIn: picked.map((p) => p.slug) }, images: { some: { url: { startsWith: "/art/jersey/" } } } },
            include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, team: true },
            orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
            take: 7 - picked.length,
          })),
        );
      }
      const featured = picked
        .map((p) => ({ slug: p!.slug, name: L(p!.name, p!.nameBn ?? undefined), image: p!.images[0]?.url ?? null, price: effectivePrice(p!).price, teamName: p!.team?.name ?? null }));
      return <Hero c={hc} featured={featured} />;
    }
    case "edits": {
      const ec = c as SectionContent<"edits">;
      return <Edits c={ec} images={await imagesBySlug(ec.items.map((i) => i.productSlug).filter(Boolean) as string[])} />;
    }
    case "category_cards": {
      const cc = c as SectionContent<"category_cards">;
      return <CategoryCards c={cc} images={await imagesBySlug(cc.items.map((i) => i.productSlug).filter(Boolean) as string[])} />;
    }
    case "product_rail": {
      const pc = c as SectionContent<"product_rail">;
      let items;
      if (pc.source === "best") items = await getBestSellers(pc.limit, locale);
      else if (pc.source === "new") items = await getProductList({ take: pc.limit, orderBy: [{ publishedAt: "desc" }] }, locale);
      else if (pc.source === "featured") items = await getProductList({ where: { isFeatured: true }, take: pc.limit }, locale);
      else if (pc.source === "collection" && pc.collectionSlug)
        items = await getProductList({ where: { collections: { some: { collection: { slug: pc.collectionSlug } } } }, take: pc.limit }, locale);
      else {
        const list = await getProductList({ where: { slug: { in: pc.productSlugs } }, take: pc.limit }, locale);
        items = pc.productSlugs.map((slug) => list.find((x) => x.slug === slug)).filter(Boolean) as typeof list;
      }
      return (
        <ProductRail
          eyebrow={L(pc.eyebrow, pc.eyebrowBn) || undefined}
          title={L(pc.title, pc.titleBn)}
          sub={L(pc.sub, pc.subBn) || undefined}
          href={pc.href || undefined}
          align={pc.align}
          columns={pc.columns as 3 | 4}
          ctaLabel={L(pc.ctaLabel, pc.ctaLabelBn) || undefined}
          items={items}
        />
      );
    }
    case "featured_collections": {
      const fc = c as SectionContent<"featured_collections">;
      const cols = await db.collection.findMany({
        where: { slug: { in: fc.collectionSlugs }, isActive: true },
        include: {
          _count: { select: { products: { where: { product: publishedWhere() } } } },
          products: { where: { product: publishedWhere() }, take: 5, orderBy: { sortOrder: "asc" }, include: { product: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } } } } },
        },
      });
      const ordered = fc.collectionSlugs.map((slug) => cols.find((x) => x.slug === slug)).filter(Boolean).map((col) => ({
        slug: col!.slug, name: col!.name, nameBn: col!.nameBn, description: col!.description, accentHex: col!.accentHex, imageUrl: col!.imageUrl,
        images: col!.products.map((p) => p.product.images[0]?.url).filter(Boolean) as string[], count: col!._count.products,
      }));
      const products = ordered[0] ? await getProductList({ where: { collections: { some: { collection: { slug: ordered[0].slug } } } }, take: 2 }, locale) : [];
      return <FeaturedCollections eyebrow={L(fc.eyebrow, fc.eyebrowBn) || undefined} title={L(fc.title, fc.titleBn)} collections={ordered} products={products} />;
    }
    case "personalise_promo": {
      const pp = c as SectionContent<"personalise_promo">;
      const p = pp.productSlug ? await db.product.findFirst({ where: { slug: pp.productSlug, ...publishedWhere() }, select: { id: true, slug: true, design: true } }) : null;
      return <PersonalisePromo c={pp} product={p ? { id: p.id, slug: p.slug, design: p.design as unknown as JerseyDesign | null } : null} />;
    }
    case "club_national": {
      const teams = await db.team.findMany({ include: { _count: { select: { products: { where: publishedWhere() } } } }, orderBy: { name: "asc" } });
      return (
        <ClubNational
          title={L((c as SectionContent<"club_national">).title, (c as SectionContent<"club_national">).titleBn)}
          teams={teams.filter((x) => x._count.products > 0).map((x) => ({ slug: x.slug, name: x.name, nameBn: x.nameBn, kind: x.kind, primaryHex: x.primaryHex, secondaryHex: x.secondaryHex, count: x._count.products }))}
        />
      );
    }
    case "tryon_promo": {
      const p = await db.product.findFirst({ where: { tryOnEnabled: true, isFeatured: true, ...publishedWhere() }, include: { images: { take: 1, orderBy: { sortOrder: "asc" } } } });
      return <TryOnPromo c={c as SectionContent<"tryon_promo">} jerseyImage={p?.images[0]?.url ?? null} />;
    }
    case "editorial_banner": {
      const ec = c as SectionContent<"editorial_banner">;
      const img = ec.productSlug ? (await imagesBySlug([ec.productSlug]))[ec.productSlug] : null;
      const usesDiscount = /\{maxOff\}/.test(ec.headline + ec.headlineBn + ec.body + ec.bodyBn);
      const maxOff = usesDiscount ? await maxLiveDiscount() : 0;
      // Never advertise a discount that doesn't exist.
      if (usesDiscount && maxOff <= 0) return null;
      return <EditorialBanner c={ec} productImage={img ?? null} maxOff={maxOff} />;
    }
    case "trust":
      return <Trust />;
    case "reviews": {
      const rc = c as SectionContent<"reviews">;
      const reviews = await db.review.findMany({
        where: { status: "APPROVED", rating: { gte: 4 } },
        include: { user: { select: { name: true } }, product: { include: { images: { take: 1, orderBy: { sortOrder: "asc" } } } } },
        orderBy: { createdAt: "desc" },
        take: 6,
      });
      return (
        <Reviews
          title={L(rc.title, rc.titleBn)}
          verifiedLabel={t.product.verifiedBuyer}
          reviews={reviews.map((r) => ({
            id: r.id, rating: r.rating, title: r.title, body: r.body,
            author: r.user.name.split(" ")[0] + (r.user.name.split(" ")[1] ? ` ${r.user.name.split(" ")[1][0]}.` : ""),
            product: { name: r.product.name, slug: r.product.slug, image: r.product.images[0]?.url ?? null },
          }))}
        />
      );
    }
    case "recently_viewed":
      return <RecentlyViewed />;
    case "newsletter":
      return <NewsletterBlock />;
    default:
      return null;
  }
}

export function SectionsRenderer({ sections, t, locale }: { sections: RenderableSection[]; t: Dictionary; locale: Locale }) {
  return (
    <>
      {sections.map((s) => (
        <Section key={s.id} s={s} t={t} locale={locale} />
      ))}
    </>
  );
}
