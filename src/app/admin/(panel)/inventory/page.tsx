import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/auth/guards";
import { FilterTabs, PageHeader, Pagination } from "@/components/admin/ui";
import { InventoryTable } from "@/components/admin/catalog-forms";
import { Button } from "@/components/ui/button";
export const metadata = { title: "Inventory" };
const PER = 50;
export default async function Inventory({ searchParams }: { searchParams: Promise<{ filter?: string; q?: string; page?: string }> }) {
  const staff = await requireStaffPage("products.read");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const base: Prisma.ProductVariantWhereInput = { isActive: true, product: { status: { not: "ARCHIVED" } }, ...(sp.q ? { OR: [{ sku: { contains: sp.q, mode: "insensitive" } }, { product: { name: { contains: sp.q, mode: "insensitive" } } }] } : {}) };
  let ids: string[] | null = null;
  if (sp.filter === "low") ids = (await db.$queryRaw<{ id: string }[]>`SELECT id FROM "ProductVariant" WHERE "isActive" AND stock <= "lowStockThreshold"`).map((r) => r.id);
  const where: Prisma.ProductVariantWhereInput = { ...base, ...(sp.filter === "out" ? { stock: 0 } : {}), ...(ids ? { id: { in: ids } } : {}) };
  const [rows, total] = await Promise.all([
    db.productVariant.findMany({ where, orderBy: [{ stock: "asc" }, { sku: "asc" }], skip: (page - 1) * PER, take: PER, include: { product: { select: { name: true, id: true } }, movements: { orderBy: { createdAt: "desc" }, take: 6 } } }),
    db.productVariant.count({ where }),
  ]);
  const href = (o: Record<string, string | undefined>) => { const p = new URLSearchParams(); for (const [k, v] of Object.entries({ filter: sp.filter, q: sp.q, ...o })) if (v) p.set(k, v); return `/admin/inventory${p.toString() ? `?${p}` : ""}`; };
  return (
    <div>
      <PageHeader title="Inventory" description="Variant-level stock. Orders decrement stock atomically; cancellations restock." />
      <FilterTabs active={sp.filter ?? "all"} items={[{ key: "all", label: "All variants", href: href({ filter: undefined, page: undefined }) }, { key: "low", label: "Low stock", href: href({ filter: "low", page: undefined }) }, { key: "out", label: "Out of stock", href: href({ filter: "out", page: undefined }) }]} />
      <form className="mb-4 flex gap-2">{sp.filter && <input type="hidden" name="filter" value={sp.filter} />}<input name="q" defaultValue={sp.q} placeholder="SKU or product" className="h-9 w-64 rounded-lg border border-border bg-surface px-3 text-sm" /><Button size="sm" variant="secondary">Search</Button></form>
      <InventoryTable canWrite={staff.permissions.has("inventory.write")} rows={rows.map((v) => ({ id: v.id, sku: v.sku, product: v.product.name, productId: v.product.id, size: v.size, color: v.color, stock: v.stock, low: v.lowStockThreshold, movements: v.movements.map((m) => ({ delta: m.delta, reason: m.reason, at: m.createdAt.toISOString(), after: m.stockAfter, note: m.note })) }))} />
      <Pagination page={page} pages={Math.ceil(total / PER)} href={(p) => href({ page: String(p) })} />
    </div>
  );
}
