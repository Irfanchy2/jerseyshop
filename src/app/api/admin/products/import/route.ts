import { z } from "zod";
import type { KitType, ProductStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { json, route, HttpError } from "@/lib/api";
import { parseCsv } from "@/lib/admin/csv";
import { toMinor } from "@/lib/money";
import { slugify } from "@/lib/utils";
import { audit } from "@/lib/audit";

const KITS = ["HOME", "AWAY", "THIRD", "GOALKEEPER", "TRAINING", "RETRO", "FAN", "CUSTOM"];
const row = z.object({
  sku: z.string().min(3), product_slug: z.string().optional(), product_name: z.string().min(3), category_slug: z.string().min(1), team_slug: z.string().optional(),
  season: z.string().optional(), kit_type: z.string().optional(), status: z.string().optional(), price: z.string().min(1), compare_at: z.string().optional(),
  size: z.string().min(1), color: z.string().min(1), color_hex: z.string().regex(/^#[0-9a-fA-F]{6}$/).or(z.literal("")).optional(), stock: z.string().regex(/^\d+$/),
  variant_price: z.string().optional(), description: z.string().optional(), tags: z.string().optional(),
});

/**
 * Bulk import/update from CSV (same columns as the export). Upserts products by slug and variants by SKU.
 * dryRun=1 validates and reports without writing.
 */
export const POST = route(async (req) => {
  const staff = await requirePermission("products.write");
  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dryRun") === "1";
  const text = await req.text();
  if (text.length > 5_000_000) throw new HttpError(413, "CSV too large (max 5 MB)");
  const [header, ...rows] = parseCsv(text.replace(/^﻿/, ""));
  if (!header?.includes("sku")) throw new HttpError(400, "Missing header row (export products to get the template).");
  const categories = new Map((await db.category.findMany()).map((c) => [c.slug, c.id]));
  const teams = new Map((await db.team.findMany()).map((t) => [t.slug, t.id]));
  const errors: { line: number; error: string }[] = [];
  const parsed: z.infer<typeof row>[] = [];
  rows.forEach((r, i) => {
    const obj = Object.fromEntries(header.map((h, j) => [h.trim(), (r[j] ?? "").replace(/^'(?=[=+\-@])/, "").trim()]));
    const res = row.safeParse(obj);
    if (!res.success) return errors.push({ line: i + 2, error: res.error.issues.map((x) => `${x.path.join(".")}: ${x.message}`).join("; ") });
    if (!categories.has(res.data.category_slug)) return errors.push({ line: i + 2, error: `Unknown category ${res.data.category_slug}` });
    if (res.data.team_slug && !teams.has(res.data.team_slug)) return errors.push({ line: i + 2, error: `Unknown team ${res.data.team_slug}` });
    try { toMinor(res.data.price); if (res.data.variant_price) toMinor(res.data.variant_price); } catch { return errors.push({ line: i + 2, error: "Invalid price" }); }
    parsed.push(res.data);
  });
  if (errors.length || dryRun) return json({ ok: errors.length === 0, dryRun, rows: rows.length, valid: parsed.length, errors: errors.slice(0, 100) });

  let created = 0, updated = 0;
  await db.$transaction(async (tx) => {
    for (const r of parsed) {
      const slug = slugify(r.product_slug || r.product_name);
      const kit = (KITS.includes((r.kit_type ?? "").toUpperCase()) ? r.kit_type!.toUpperCase() : "HOME") as KitType;
      const status = (["ACTIVE", "DRAFT", "ARCHIVED"].includes((r.status ?? "").toUpperCase()) ? r.status!.toUpperCase() : "DRAFT") as ProductStatus;
      const pdata = { name: r.product_name, categoryId: categories.get(r.category_slug)!, teamId: r.team_slug ? teams.get(r.team_slug)! : null, season: r.season || null, kitType: kit, status, priceMinor: toMinor(r.price), compareAtMinor: r.compare_at ? toMinor(r.compare_at) : null, ...(r.description ? { description: r.description } : {}), ...(r.tags ? { tags: r.tags.split("|").filter(Boolean) } : {}) };
      const product = await tx.product.upsert({ where: { slug }, create: { slug, description: r.description || r.product_name, publishedAt: status === "ACTIVE" ? new Date() : null, ...pdata }, update: pdata });
      const vdata = { size: r.size, color: r.color, colorHex: r.color_hex || "#111111", priceMinor: r.variant_price ? toMinor(r.variant_price) : null };
      const existing = await tx.productVariant.findUnique({ where: { sku: r.sku.toUpperCase() } });
      const stock = Number(r.stock);
      if (existing) {
        await tx.productVariant.update({ where: { id: existing.id }, data: { ...vdata, stock } });
        if (existing.stock !== stock) await tx.inventoryMovement.create({ data: { variantId: existing.id, delta: stock - existing.stock, reason: "adjustment", note: "CSV import", actorId: staff.id, stockAfter: stock } });
        updated++;
      } else {
        const v = await tx.productVariant.create({ data: { ...vdata, sku: r.sku.toUpperCase(), stock, productId: product.id } });
        if (stock) await tx.inventoryMovement.create({ data: { variantId: v.id, delta: stock, reason: "restock", note: "CSV import", actorId: staff.id, stockAfter: stock } });
        created++;
      }
    }
  }, { timeout: 60000 });
  await audit({ actorId: staff.id, action: "products.import", entityType: "product", summary: `${created} variants created, ${updated} updated` });
  return json({ ok: true, created, updated });
});
