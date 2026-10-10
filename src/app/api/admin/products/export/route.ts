import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { handleApiError } from "@/lib/api";
import { csvCell } from "@/lib/admin/csv";
import { toMajorString } from "@/lib/money";

const PRODUCT_CSV_HEADER = ["sku", "product_slug", "product_name", "category_slug", "team_slug", "season", "kit_type", "status", "price", "compare_at", "size", "color", "color_hex", "stock", "variant_price", "description", "tags"];

/** One row per variant; re-importable with /admin/products/import. */
export async function GET() {
  try {
    await requirePermission("products.read");
    const products = await db.product.findMany({ include: { variants: { orderBy: { sortOrder: "asc" } }, category: true, team: true }, orderBy: { name: "asc" } });
    const lines = products.flatMap((p) => p.variants.map((v) => [v.sku, p.slug, p.name, p.category.slug, p.team?.slug ?? "", p.season ?? "", p.kitType, p.status, toMajorString(p.priceMinor), p.compareAtMinor ? toMajorString(p.compareAtMinor) : "", v.size, v.color, v.colorHex, v.stock, v.priceMinor ? toMajorString(v.priceMinor) : "", p.description, p.tags.join("|")].map(csvCell).join(",")));
    return new Response([PRODUCT_CSV_HEADER.join(","), ...lines].join("\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="products-${new Date().toISOString().slice(0, 10)}.csv"` } });
  } catch (e) {
    return handleApiError(e);
  }
}
