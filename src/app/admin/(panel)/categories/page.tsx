import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/auth/guards";
import { PageHeader } from "@/components/admin/ui";
import { CategoriesManager } from "@/components/admin/catalog-forms";
export const metadata = { title: "Categories" };
export default async function Categories() {
  await requireStaffPage("products.write");
  const cats = await db.category.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { products: true } } } });
  return (<div><PageHeader title="Categories" description="Organise the catalog and storefront navigation" /><CategoriesManager items={cats.map((c) => ({ id: c.id, name: c.name, nameBn: c.nameBn ?? "", slug: c.slug, description: c.description ?? "", parentId: c.parentId, sortOrder: c.sortOrder, isActive: c.isActive, count: c._count.products }))} /></div>);
}
