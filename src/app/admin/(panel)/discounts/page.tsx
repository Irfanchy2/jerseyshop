import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/auth/guards";
import { Card, PageHeader } from "@/components/admin/ui";
import { BundlesManager, CouponsManager } from "@/components/admin/sales-forms";
export const metadata = { title: "Discounts" };
const local = (d: Date | null) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : null);
export default async function Discounts() {
  await requireStaffPage("discounts.write");
  const [coupons, bundles, products] = await Promise.all([
    db.coupon.findMany({ orderBy: { createdAt: "desc" } }),
    db.bundle.findMany({ include: { items: true }, orderBy: { createdAt: "desc" } }),
    db.product.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title="Discounts" description="Coupon codes and product bundles. Discounts are validated server-side at checkout." />
      <Card title="Coupons"><CouponsManager items={coupons.map((c) => ({ id: c.id, code: c.code, description: c.description ?? "", type: c.type, value: c.type === "FIXED" ? c.value / 100 : c.value, minSubtotal: c.minSubtotalMinor / 100, maxDiscount: c.maxDiscountMinor != null ? c.maxDiscountMinor / 100 : null, startsAt: local(c.startsAt), endsAt: local(c.endsAt), usageLimit: c.usageLimit, perCustomerLimit: c.perCustomerLimit, isActive: c.isActive, usedCount: c.usedCount }))} /></Card>
      <Card title="Bundles"><BundlesManager products={products} items={bundles.map((b) => ({ id: b.id, name: b.name, description: b.description ?? "", discountPercent: b.discountPercent, isActive: b.isActive, productIds: b.items.map((i) => i.productId) }))} /></Card>
    </div>
  );
}
