import type { Metadata } from "next";
import { db } from "@/lib/db";
import { parseFilters } from "@/lib/catalog/queries";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { CatalogView } from "@/components/store/catalog/catalog-view";
import { track } from "@/lib/analytics";

type SP = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const sp = await searchParams;
  const cat = typeof sp.category === "string" ? await db.category.findUnique({ where: { slug: sp.category } }) : null;
  return { title: cat ? cat.name : "Shop all jerseys", alternates: { canonical: cat ? `/shop?category=${cat.slug}` : "/shop" } };
}

export default async function ShopPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const [t, locale] = await Promise.all([getDictionary(), getLocale()]);
  const cat = filters.category ? await db.category.findUnique({ where: { slug: filters.category } }) : null;
  const team = filters.teams?.length === 1 ? await db.team.findUnique({ where: { slug: filters.teams[0] } }) : null;
  if (filters.q) await track("search", { props: { q: filters.q } });
  const title = filters.q ? `“${filters.q}”` : team ? team.name : cat ? (locale === "bn" && cat.nameBn ? cat.nameBn : cat.name) : t.shop.title;
  return <CatalogView filters={filters} basePath="/shop" title={title} description={cat?.description} searchParams={sp} eyebrow={filters.q ? t.nav.search : undefined} />;
}
