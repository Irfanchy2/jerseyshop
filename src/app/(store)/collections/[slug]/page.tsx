import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { parseFilters } from "@/lib/catalog/queries";
import { getLocale } from "@/lib/i18n/server";
import { CatalogView } from "@/components/store/catalog/catalog-view";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const col = await db.collection.findUnique({ where: { slug: (await params).slug } });
  return col ? { title: col.name, description: col.description ?? undefined } : {};
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const [{ slug }, sp, locale] = await Promise.all([params, searchParams, getLocale()]);
  const col = await db.collection.findFirst({ where: { slug, isActive: true } });
  if (!col) notFound();
  const filters = { ...parseFilters(sp), collection: slug };
  return <CatalogView filters={filters} basePath={`/collections/${slug}`} title={locale === "bn" && col.nameBn ? col.nameBn : col.name} description={col.description} eyebrow="Collection" searchParams={sp} />;
}
