import Link from "next/link";
import type { Prisma, ProductStatus } from "@prisma/client";
import { Plus, Download, Upload } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/auth/guards";
import { effectivePrice } from "@/lib/catalog/pricing";
import { formatMoney } from "@/lib/money";
import { FilterTabs, PageHeader, Pagination, EmptyState } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { ProductsTable } from "@/components/admin/products-table";

export const metadata = { title: "Products" };
const PER = 30;

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; category?: string; page?: string }> }) {
  const staff = await requireStaffPage("products.read");
  const sp = await searchParams;
  const status = ["ACTIVE", "DRAFT", "ARCHIVED"].includes(sp.status ?? "") ? (sp.status as ProductStatus) : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.ProductWhereInput = {
    ...(status ? { status } : {}),
    ...(sp.category ? { categoryId: sp.category } : {}),
    ...(sp.q ? { OR: [{ name: { contains: sp.q, mode: "insensitive" } }, { variants: { some: { sku: { contains: sp.q, mode: "insensitive" } } } }, { tags: { has: sp.q.toLowerCase() } }] } : {}),
  };
  const [products, total, counts, categories] = await Promise.all([
    db.product.findMany({ where, orderBy: { updatedAt: "desc" }, skip: (page - 1) * PER, take: PER, include: { images: { take: 1, orderBy: { sortOrder: "asc" } }, category: true, team: true, variants: { select: { stock: true, isActive: true } } } }),
    db.product.count({ where }),
    db.product.groupBy({ by: ["status"], _count: true }),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  const c = (s?: string) => (s ? counts.find((x) => x.status === s)?._count ?? 0 : counts.reduce((a, x) => a + x._count, 0));
  const qs = (o: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ status: sp.status, q: sp.q, category: sp.category, ...o })) if (v) p.set(k, v);
    return `/admin/products${p.toString() ? `?${p}` : ""}`;
  };
  return (
    <div>
      <PageHeader
        title="Products"
        description={`${total} product${total === 1 ? "" : "s"}`}
        actions={
          <>
            <Button asChild variant="outline" size="sm"><a href="/api/admin/products/export"><Download className="h-4 w-4" /> Export CSV</a></Button>
            {staff.permissions.has("products.write") && <Button asChild variant="outline" size="sm"><Link href="/admin/products/import"><Upload className="h-4 w-4" /> Import</Link></Button>}
            {staff.permissions.has("products.write") && <Button asChild size="sm"><Link href="/admin/products/new"><Plus className="h-4 w-4" /> Add product</Link></Button>}
          </>
        }
      />
      <FilterTabs active={status ?? "ALL"} items={[{ key: "ALL", label: "All", href: qs({ status: undefined, page: undefined }), count: c() }, ...(["ACTIVE", "DRAFT", "ARCHIVED"] as const).map((s) => ({ key: s, label: s.charAt(0) + s.slice(1).toLowerCase(), href: qs({ status: s, page: undefined }), count: c(s) }))]} />
      <form className="mb-4 flex flex-wrap gap-2">
        {status && <input type="hidden" name="status" value={status} />}
        <input name="q" defaultValue={sp.q} placeholder="Search name, SKU or tag" className="h-9 w-64 rounded-lg border border-border bg-surface px-3 text-sm" />
        <select name="category" defaultValue={sp.category ?? ""} className="h-9 rounded-lg border border-border bg-surface px-3 text-sm"><option value="">All categories</option>{categories.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
        <Button size="sm" variant="secondary" type="submit">Filter</Button>
      </form>
      {products.length === 0 ? (
        <EmptyState title="No products found" action={staff.permissions.has("products.write") ? <Button asChild size="sm"><Link href="/admin/products/new">Add your first product</Link></Button> : undefined} />
      ) : (
        <ProductsTable
          canWrite={staff.permissions.has("products.write")}
          rows={products.map((p) => {
            const price = effectivePrice(p);
            const active = p.variants.filter((v) => v.isActive);
            return {
              id: p.id, name: p.name, slug: p.slug, image: p.images[0]?.url ?? null, status: p.status, category: p.category.name, team: p.team?.name ?? null,
              price: formatMoney(price.price), onSale: !!price.original, stock: active.reduce((s, v) => s + v.stock, 0), variants: active.length,
              flags: [p.isFeatured && "Featured", p.tryOnEnabled && "Try-on", p.customizable && "Personalise"].filter(Boolean) as string[],
            };
          })}
        />
      )}
      <Pagination page={page} pages={Math.ceil(total / PER)} href={(p) => qs({ page: String(p) })} />
    </div>
  );
}
