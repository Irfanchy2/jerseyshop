import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/auth/guards";
import { PageHeader } from "@/components/admin/ui";
import { CollectionsManager } from "@/components/admin/catalog-forms";
export const metadata = { title: "Collections" };
export default async function Collections() {
  await requireStaffPage("products.write");
  const [cols, products] = await Promise.all([
    db.collection.findMany({ orderBy: { sortOrder: "asc" }, include: { products: { orderBy: { sortOrder: "asc" } } } }),
    db.product.findMany({ where: { status: { not: "ARCHIVED" } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return (<div><PageHeader title="Collections" description="Curated groups shown on the storefront" /><CollectionsManager products={products} items={cols.map((c) => ({ id: c.id, name: c.name, nameBn: c.nameBn ?? "", slug: c.slug, description: c.description ?? "", kind: c.kind, imageUrl: c.imageUrl, accentHex: c.accentHex, isFeatured: c.isFeatured, isActive: c.isActive, sortOrder: c.sortOrder, productIds: c.products.map((p) => p.productId), count: c.products.length }))} /></div>);
}
