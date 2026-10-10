import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/auth/guards";
import { PageHeader } from "@/components/admin/ui";
import { TemplatesManager } from "@/components/admin/catalog-forms";
export const metadata = { title: "Customisation templates" };
export default async function Customizer() {
  await requireStaffPage("products.write");
  const items = await db.customizationTemplate.findMany({ orderBy: { createdAt: "asc" }, include: { _count: { select: { products: true } } } });
  type A = { x: number; y: number; w: number; h: number };
  return (<div><PageHeader title="Jersey customisation" description="Templates control printable areas, fonts, colours, limits and the personalisation price. Assign a template to a product in its editor." /><TemplatesManager items={items.map((t) => ({ id: t.id, name: t.name, modelUrl: t.modelUrl, nameArea: t.nameArea as A, numberArea: t.numberArea as A, frontNumberArea: (t.frontNumberArea as A | null) ?? null, allowedColors: t.allowedColors, allowedFonts: t.allowedFonts as ("block" | "classic" | "modern")[], price: t.priceMinor / 100, maxNameLength: t.maxNameLength, maxNumberDigits: t.maxNumberDigits, isActive: t.isActive, products: t._count.products }))} /></div>);
}
