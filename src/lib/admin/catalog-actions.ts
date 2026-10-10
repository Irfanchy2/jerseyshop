"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { slugify } from "@/lib/utils";
import { staffAction, fail, type ActionResult } from "./guard";
import { storeUpload } from "./media";

const money = z.coerce.number().min(0).max(1_000_000);
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);

const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(3).max(140),
  nameBn: z.string().trim().max(200).optional(),
  slug: z.string().trim().max(120).optional(),
  description: z.string().trim().min(10).max(5000),
  descriptionBn: z.string().trim().max(5000).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
  categoryId: z.string().min(1, "Choose a category"),
  teamId: z.string().optional(),
  season: z.string().max(40).optional(),
  kitType: z.enum(["HOME", "AWAY", "THIRD", "GOALKEEPER", "TRAINING", "RETRO", "FAN", "CUSTOM"]),
  price: money.refine((v) => v > 0, "Price must be greater than 0"),
  compareAt: money.optional().nullable(),
  salePrice: money.optional().nullable(),
  saleStartsAt: z.string().optional().nullable(),
  saleEndsAt: z.string().optional().nullable(),
  fabric: z.string().max(300).optional(),
  care: z.string().max(300).optional(),
  fit: z.string().max(300).optional(),
  tags: z.array(z.string().trim().toLowerCase().max(30)).max(20),
  isFeatured: z.boolean(),
  isBestSeller: z.boolean(),
  tryOnEnabled: z.boolean(),
  garmentImageUrl: z.string().max(500).optional().nullable(),
  customizable: z.boolean(),
  templateId: z.string().optional().nullable(),
  model3dUrl: z.string().max(500).optional().nullable(),
  seoTitle: z.string().max(80).optional(),
  seoDescription: z.string().max(200).optional(),
  publishedAt: z.string().optional().nullable(),
  collectionIds: z.array(z.string()).max(30),
  design: z.object({
    pattern: z.enum(["plain", "stripes", "pinstripe", "hoops", "halves", "sash", "chevron", "gradient", "band", "quarters"]),
    base: hex, secondary: hex, trim: hex,
    collar: z.enum(["crew", "v", "polo"]).optional(),
    sleeveColor: hex.optional().nullable(),
    longSleeve: z.boolean().optional(),
    crest: z.object({ shape: z.enum(["shield", "circle", "diamond"]), initials: z.string().max(3) }).optional().nullable(),
  }).nullable(),
  images: z.array(z.object({ url: z.string().min(1).max(500), alt: z.string().max(200).optional(), kind: z.enum(["FRONT", "BACK", "DETAIL", "LIFESTYLE", "GARMENT"]) })).max(20),
  variants: z.array(z.object({
    id: z.string().optional(),
    size: z.string().trim().min(1).max(20),
    color: z.string().trim().min(1).max(40),
    colorHex: hex,
    sku: z.string().trim().min(3).max(60),
    price: money.optional().nullable(),
    stock: z.coerce.number().int().min(0).max(100000),
    lowStockThreshold: z.coerce.number().int().min(0).max(1000),
    isActive: z.boolean(),
  })).min(1, "Add at least one variant"),
});
export type ProductInput = z.infer<typeof productSchema>;

const toMinor = (v: number | null | undefined) => (v == null ? null : Math.round(v * 100));
const toDate = (v: string | null | undefined) => (v ? new Date(v) : null);

export async function saveProductAction(input: ProductInput): Promise<ActionResult> {
  try {
    const staff = await staffAction("products.write");
    const d = productSchema.parse(input);
    if (d.salePrice != null && d.salePrice >= d.price) return { ok: false, error: "Sale price must be lower than the price.", fieldErrors: { salePrice: "Must be lower than price" } };
    if (d.customizable && !d.templateId) return { ok: false, error: "Choose a customisation template.", fieldErrors: { templateId: "Required when personalisation is on" } };
    const skus = d.variants.map((v) => v.sku.toUpperCase());
    if (new Set(skus).size !== skus.length) return { ok: false, error: "Each variant needs a unique SKU." };
    const combos = d.variants.map((v) => `${v.size}|${v.color}`);
    if (new Set(combos).size !== combos.length) return { ok: false, error: "Each size/colour combination can only appear once." };
    const slug = slugify(d.slug || d.name);
    const clash = await db.product.findFirst({ where: { slug, id: d.id ? { not: d.id } : undefined } });
    if (clash) return { ok: false, error: "Another product already uses this URL slug.", fieldErrors: { slug: "Already in use" } };
    const skuClash = await db.productVariant.findFirst({ where: { sku: { in: skus }, productId: d.id ? { not: d.id } : undefined } });
    if (skuClash) return { ok: false, error: `SKU ${skuClash.sku} is already used by another product.` };

    const data = {
      slug, name: d.name, nameBn: d.nameBn || null, description: d.description, descriptionBn: d.descriptionBn || null, status: d.status,
      categoryId: d.categoryId, teamId: d.teamId || null, season: d.season || null, kitType: d.kitType,
      priceMinor: toMinor(d.price)!, compareAtMinor: toMinor(d.compareAt), salePriceMinor: toMinor(d.salePrice), saleStartsAt: toDate(d.saleStartsAt), saleEndsAt: toDate(d.saleEndsAt),
      fabric: d.fabric || null, care: d.care || null, fit: d.fit || null, tags: d.tags, isFeatured: d.isFeatured, isBestSeller: d.isBestSeller,
      tryOnEnabled: d.tryOnEnabled, garmentImageUrl: d.garmentImageUrl || null, customizable: d.customizable, templateId: d.customizable ? d.templateId || null : null,
      model3dUrl: d.model3dUrl || null, seoTitle: d.seoTitle || null, seoDescription: d.seoDescription || null,
      design: d.design ? (d.design as Prisma.InputJsonValue) : Prisma.DbNull,
      publishedAt: d.status === "ACTIVE" ? toDate(d.publishedAt) ?? new Date() : toDate(d.publishedAt),
    };

    const id = await db.$transaction(async (tx) => {
      const product = d.id ? await tx.product.update({ where: { id: d.id }, data }) : await tx.product.create({ data });
      // Images: replace the ordered list.
      await tx.productImage.deleteMany({ where: { productId: product.id } });
      if (d.images.length) await tx.productImage.createMany({ data: d.images.map((im, i) => ({ productId: product.id, url: im.url, alt: im.alt || `${d.name} — ${im.kind.toLowerCase()}`, kind: im.kind, sortOrder: i })) });
      // Variants: update existing, create new, deactivate removed ones that have order history, delete the rest.
      const existing = await tx.productVariant.findMany({ where: { productId: product.id }, include: { _count: { select: { orderItems: true } } } });
      const keep = new Set(d.variants.map((v) => v.id).filter(Boolean));
      for (const old of existing.filter((e) => !keep.has(e.id))) {
        if (old._count.orderItems) await tx.productVariant.update({ where: { id: old.id }, data: { isActive: false } });
        else await tx.productVariant.delete({ where: { id: old.id } });
      }
      for (const [i, v] of d.variants.entries()) {
        const vd = { size: v.size, color: v.color, colorHex: v.colorHex, sku: v.sku.toUpperCase(), priceMinor: toMinor(v.price), lowStockThreshold: v.lowStockThreshold, isActive: v.isActive, sortOrder: i };
        const prev = existing.find((e) => e.id === v.id);
        if (prev) {
          await tx.productVariant.update({ where: { id: prev.id }, data: { ...vd, stock: v.stock } });
          if (prev.stock !== v.stock) await tx.inventoryMovement.create({ data: { variantId: prev.id, delta: v.stock - prev.stock, reason: "adjustment", actorId: staff.id, note: "Edited in product form", stockAfter: v.stock } });
        } else {
          const created = await tx.productVariant.create({ data: { ...vd, stock: v.stock, productId: product.id } });
          if (v.stock) await tx.inventoryMovement.create({ data: { variantId: created.id, delta: v.stock, reason: "restock", actorId: staff.id, note: "Initial stock", stockAfter: v.stock } });
        }
      }
      await tx.productCollection.deleteMany({ where: { productId: product.id, collectionId: { notIn: d.collectionIds } } });
      await tx.productCollection.createMany({ data: d.collectionIds.map((collectionId) => ({ productId: product.id, collectionId })), skipDuplicates: true });
      return product.id;
    });
    await audit({ actorId: staff.id, action: d.id ? "product.update" : "product.create", entityType: "product", entityId: id, summary: d.name, diff: { status: d.status, price: d.price, variants: d.variants.length } });
    revalidatePath("/admin/products");
    revalidatePath(`/products/${slug}`);
    revalidatePath("/", "layout");
    return { ok: true, message: d.id ? "Product saved." : "Product created.", id };
  } catch (e) {
    return fail(e);
  }
}

export async function setProductStatusAction(ids: string[], status: "ACTIVE" | "DRAFT" | "ARCHIVED"): Promise<ActionResult> {
  try {
    const staff = await staffAction("products.write");
    await db.product.updateMany({ where: { id: { in: ids } }, data: { status, ...(status === "ACTIVE" ? {} : {}) } });
    await db.product.updateMany({ where: { id: { in: ids }, status: "ACTIVE", publishedAt: null }, data: { publishedAt: new Date() } });
    await audit({ actorId: staff.id, action: "product.status", entityType: "product", summary: `${ids.length} → ${status}`, diff: { ids } });
    revalidatePath("/admin/products");
    revalidatePath("/", "layout");
    return { ok: true, message: `${ids.length} product(s) set to ${status.toLowerCase()}.` };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteProductAction(id: string): Promise<ActionResult> {
  try {
    const staff = await staffAction("products.write");
    const orders = await db.orderItem.count({ where: { productId: id } });
    if (orders) {
      await db.product.update({ where: { id }, data: { status: "ARCHIVED" } });
      await audit({ actorId: staff.id, action: "product.archive", entityType: "product", entityId: id, summary: "has order history — archived instead of deleted" });
      return { ok: true, message: "This product has orders, so it was archived instead of deleted." };
    }
    const p = await db.product.delete({ where: { id } });
    await audit({ actorId: staff.id, action: "product.delete", entityType: "product", entityId: id, summary: p.name });
    revalidatePath("/admin/products");
    return { ok: true, message: "Product deleted." };
  } catch (e) {
    return fail(e);
  }
}

/** Upload an image or GLB from an admin form. Returns the public URL in `message`. */
export async function uploadMediaAction(fd: FormData): Promise<ActionResult & { url?: string; mime?: string }> {
  try {
    const staff = await staffAction("content.write").catch(() => staffAction("products.write"));
    const file = fd.get("file");
    if (!(file instanceof File) || !file.size) return { ok: false, error: "Choose a file." };
    const folder = String(fd.get("folder") ?? "general").replace(/[^a-z0-9-]/g, "") || "general";
    const asset = await storeUpload(file, folder, staff.id, String(fd.get("alt") ?? "") || undefined);
    await audit({ actorId: staff.id, action: "media.upload", entityType: "media", entityId: asset.id, summary: asset.key });
    return { ok: true, url: asset.url, mime: asset.mimeType, id: asset.id };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteMediaAction(id: string): Promise<ActionResult> {
  try {
    const staff = await staffAction("content.write");
    const asset = await db.mediaAsset.findUniqueOrThrow({ where: { id } });
    const { storage } = await import("@/lib/storage");
    await storage().delete(asset.key);
    await db.mediaAsset.delete({ where: { id } });
    await audit({ actorId: staff.id, action: "media.delete", entityType: "media", entityId: id, summary: asset.key });
    revalidatePath("/admin/content/media");
    return { ok: true, message: "File deleted." };
  } catch (e) {
    return fail(e);
  }
}

const categorySchema = z.object({ id: z.string().optional(), name: z.string().trim().min(2).max(60), nameBn: z.string().max(80).optional(), slug: z.string().max(80).optional(), description: z.string().max(300).optional(), parentId: z.string().optional().nullable(), sortOrder: z.coerce.number().int(), isActive: z.boolean() });

export async function saveCategoryAction(input: z.infer<typeof categorySchema>): Promise<ActionResult> {
  try {
    const staff = await staffAction("products.write");
    const d = categorySchema.parse(input);
    const data = { name: d.name, nameBn: d.nameBn || null, slug: slugify(d.slug || d.name), description: d.description || null, parentId: d.parentId || null, sortOrder: d.sortOrder, isActive: d.isActive };
    const c = d.id ? await db.category.update({ where: { id: d.id }, data }) : await db.category.create({ data });
    await audit({ actorId: staff.id, action: "category.save", entityType: "category", entityId: c.id, summary: c.name });
    revalidatePath("/admin/categories");
    revalidatePath("/", "layout");
    return { ok: true, message: "Category saved." };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { ok: false, error: "That slug is already used." };
    return fail(e);
  }
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  try {
    const staff = await staffAction("products.write");
    const n = await db.product.count({ where: { categoryId: id } });
    if (n) return { ok: false, error: `Move or delete its ${n} product(s) first.` };
    await db.category.delete({ where: { id } });
    await audit({ actorId: staff.id, action: "category.delete", entityType: "category", entityId: id });
    revalidatePath("/admin/categories");
    return { ok: true, message: "Category deleted." };
  } catch (e) {
    return fail(e);
  }
}

const collectionSchema = z.object({ id: z.string().optional(), name: z.string().trim().min(2).max(60), nameBn: z.string().max(80).optional(), slug: z.string().max(80).optional(), description: z.string().max(400).optional(), kind: z.enum(["CURATED", "CLUB", "NATIONAL", "SEASONAL", "TRAINING"]), imageUrl: z.string().max(500).optional().nullable(), accentHex: hex.optional().nullable(), isFeatured: z.boolean(), isActive: z.boolean(), sortOrder: z.coerce.number().int(), productIds: z.array(z.string()).max(500) });

export async function saveCollectionAction(input: z.infer<typeof collectionSchema>): Promise<ActionResult> {
  try {
    const staff = await staffAction("products.write");
    const d = collectionSchema.parse(input);
    const data = { name: d.name, nameBn: d.nameBn || null, slug: slugify(d.slug || d.name), description: d.description || null, kind: d.kind, imageUrl: d.imageUrl || null, accentHex: d.accentHex || null, isFeatured: d.isFeatured, isActive: d.isActive, sortOrder: d.sortOrder };
    const c = await db.$transaction(async (tx) => {
      const col = d.id ? await tx.collection.update({ where: { id: d.id }, data }) : await tx.collection.create({ data });
      await tx.productCollection.deleteMany({ where: { collectionId: col.id } });
      await tx.productCollection.createMany({ data: d.productIds.map((productId, i) => ({ productId, collectionId: col.id, sortOrder: i })) });
      return col;
    });
    await audit({ actorId: staff.id, action: "collection.save", entityType: "collection", entityId: c.id, summary: `${c.name} (${d.productIds.length} products)` });
    revalidatePath("/admin/collections");
    revalidatePath("/", "layout");
    return { ok: true, message: "Collection saved.", id: c.id };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { ok: false, error: "That slug is already used." };
    return fail(e);
  }
}

export async function deleteCollectionAction(id: string): Promise<ActionResult> {
  try {
    const staff = await staffAction("products.write");
    await db.collection.delete({ where: { id } });
    await audit({ actorId: staff.id, action: "collection.delete", entityType: "collection", entityId: id });
    revalidatePath("/admin/collections");
    return { ok: true, message: "Collection deleted." };
  } catch (e) {
    return fail(e);
  }
}

const adjustSchema = z.object({ variantId: z.string(), delta: z.coerce.number().int().min(-100000).max(100000).refine((v) => v !== 0, "Enter a non-zero quantity"), reason: z.enum(["restock", "adjustment", "damage", "return"]), note: z.string().max(200).optional() });

export async function adjustStockAction(input: z.infer<typeof adjustSchema>): Promise<ActionResult> {
  try {
    const staff = await staffAction("inventory.write");
    const d = adjustSchema.parse(input);
    const v = await db.$transaction(async (tx) => {
      // Atomic, and never below zero.
      const res = await tx.productVariant.updateMany({ where: { id: d.variantId, ...(d.delta < 0 ? { stock: { gte: -d.delta } } : {}) }, data: { stock: { increment: d.delta } } });
      if (!res.count) throw new Error("Not enough stock to remove that quantity.");
      const updated = await tx.productVariant.findUniqueOrThrow({ where: { id: d.variantId } });
      await tx.inventoryMovement.create({ data: { variantId: d.variantId, delta: d.delta, reason: d.reason, note: d.note, actorId: staff.id, stockAfter: updated.stock } });
      return updated;
    });
    await audit({ actorId: staff.id, action: "inventory.adjust", entityType: "variant", entityId: v.id, summary: `${v.sku} ${d.delta > 0 ? "+" : ""}${d.delta} → ${v.stock}` });
    revalidatePath("/admin/inventory");
    return { ok: true, message: `${v.sku}: stock now ${v.stock}.` };
  } catch (e) {
    return fail(e);
  }
}

const areaSchema = z.object({ x: z.coerce.number().min(0).max(1), y: z.coerce.number().min(0).max(1), w: z.coerce.number().min(0.01).max(1), h: z.coerce.number().min(0.01).max(1) });
const templateSchema = z.object({
  id: z.string().optional(), name: z.string().trim().min(2).max(80), modelUrl: z.string().max(500).optional().nullable(),
  nameArea: areaSchema, numberArea: areaSchema, frontNumberArea: areaSchema.nullable(),
  allowedColors: z.array(hex).min(1).max(12), allowedFonts: z.array(z.enum(["block", "classic", "modern"])).min(1),
  price: money, maxNameLength: z.coerce.number().int().min(1).max(20), maxNumberDigits: z.coerce.number().int().min(1).max(3), isActive: z.boolean(),
});

export async function saveTemplateAction(input: z.infer<typeof templateSchema>): Promise<ActionResult> {
  try {
    const staff = await staffAction("products.write");
    const d = templateSchema.parse(input);
    const data = { name: d.name, modelUrl: d.modelUrl || null, nameArea: d.nameArea, numberArea: d.numberArea, frontNumberArea: d.frontNumberArea ?? Prisma.DbNull, allowedColors: d.allowedColors, allowedFonts: d.allowedFonts, priceMinor: Math.round(d.price * 100), maxNameLength: d.maxNameLength, maxNumberDigits: d.maxNumberDigits, isActive: d.isActive };
    const t = d.id ? await db.customizationTemplate.update({ where: { id: d.id }, data }) : await db.customizationTemplate.create({ data });
    await audit({ actorId: staff.id, action: "template.save", entityType: "customization_template", entityId: t.id, summary: t.name });
    revalidatePath("/admin/customizer");
    return { ok: true, message: "Template saved.", id: t.id };
  } catch (e) {
    return fail(e);
  }
}
