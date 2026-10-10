"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getStaff } from "@/lib/auth/session";
import { deleteTryOnJobMedia } from "@/lib/tryon/service";
import { staffAction, fail, type ActionResult } from "./guard";

const couponSchema = z.object({
  id: z.string().optional(),
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,30}$/, "3–30 letters, numbers, - or _"),
  description: z.string().max(200).optional(),
  type: z.enum(["PERCENT", "FIXED", "FREE_SHIPPING"]),
  value: z.coerce.number().min(0),
  minSubtotal: z.coerce.number().min(0),
  maxDiscount: z.coerce.number().min(0).optional().nullable(),
  startsAt: z.string().optional().nullable(),
  endsAt: z.string().optional().nullable(),
  usageLimit: z.coerce.number().int().min(1).optional().nullable(),
  perCustomerLimit: z.coerce.number().int().min(1).optional().nullable(),
  isActive: z.boolean(),
});

export async function saveCouponAction(input: z.infer<typeof couponSchema>): Promise<ActionResult> {
  try {
    const staff = await staffAction("discounts.write");
    const d = couponSchema.parse(input);
    if (d.type === "PERCENT" && (d.value <= 0 || d.value > 100)) return { ok: false, error: "Percent must be between 1 and 100.", fieldErrors: { value: "1–100" } };
    if (d.type === "FIXED" && d.value <= 0) return { ok: false, error: "Enter a discount amount.", fieldErrors: { value: "Required" } };
    const data = {
      code: d.code, description: d.description || null, type: d.type,
      value: d.type === "FIXED" ? Math.round(d.value * 100) : d.type === "PERCENT" ? Math.round(d.value) : 0,
      minSubtotalMinor: Math.round(d.minSubtotal * 100), maxDiscountMinor: d.maxDiscount ? Math.round(d.maxDiscount * 100) : null,
      startsAt: d.startsAt ? new Date(d.startsAt) : null, endsAt: d.endsAt ? new Date(d.endsAt) : null,
      usageLimit: d.usageLimit ?? null, perCustomerLimit: d.perCustomerLimit ?? null, isActive: d.isActive,
    };
    const c = d.id ? await db.coupon.update({ where: { id: d.id }, data }) : await db.coupon.create({ data });
    await audit({ actorId: staff.id, action: "coupon.save", entityType: "coupon", entityId: c.id, summary: c.code, diff: data as Prisma.InputJsonValue });
    revalidatePath("/admin/discounts");
    return { ok: true, message: `Coupon ${c.code} saved.` };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { ok: false, error: "That code already exists." };
    return fail(e);
  }
}

export async function deleteCouponAction(id: string): Promise<ActionResult> {
  try {
    const staff = await staffAction("discounts.write");
    const used = await db.couponRedemption.count({ where: { couponId: id } });
    if (used) {
      await db.coupon.update({ where: { id }, data: { isActive: false } });
      return { ok: true, message: "Coupon has been used, so it was deactivated instead of deleted." };
    }
    await db.coupon.delete({ where: { id } });
    await audit({ actorId: staff.id, action: "coupon.delete", entityType: "coupon", entityId: id });
    revalidatePath("/admin/discounts");
    return { ok: true, message: "Coupon deleted." };
  } catch (e) {
    return fail(e);
  }
}

const bundleSchema = z.object({ id: z.string().optional(), name: z.string().trim().min(2).max(80), description: z.string().max(200).optional(), discountPercent: z.coerce.number().int().min(1).max(90), isActive: z.boolean(), productIds: z.array(z.string()).min(2, "Choose at least two products").max(6) });

export async function saveBundleAction(input: z.infer<typeof bundleSchema>): Promise<ActionResult> {
  try {
    const staff = await staffAction("discounts.write");
    const d = bundleSchema.parse(input);
    const b = await db.$transaction(async (tx) => {
      const data = { name: d.name, description: d.description || null, discountPercent: d.discountPercent, isActive: d.isActive };
      const bundle = d.id ? await tx.bundle.update({ where: { id: d.id }, data }) : await tx.bundle.create({ data });
      await tx.bundleItem.deleteMany({ where: { bundleId: bundle.id } });
      await tx.bundleItem.createMany({ data: d.productIds.map((productId) => ({ bundleId: bundle.id, productId })) });
      return bundle;
    });
    await audit({ actorId: staff.id, action: "bundle.save", entityType: "bundle", entityId: b.id, summary: b.name });
    revalidatePath("/admin/discounts");
    return { ok: true, message: "Bundle saved." };
  } catch (e) {
    return fail(e);
  }
}

export async function moderateReviewAction(id: string, status: "APPROVED" | "REJECTED"): Promise<ActionResult> {
  try {
    const staff = await staffAction("reviews.write");
    const r = await db.review.update({ where: { id }, data: { status }, include: { product: true } });
    await audit({ actorId: staff.id, action: `review.${status.toLowerCase()}`, entityType: "review", entityId: id });
    revalidatePath("/admin/reviews");
    revalidatePath(`/products/${r.product.slug}`);
    return { ok: true, message: `Review ${status.toLowerCase()}.` };
  } catch (e) {
    return fail(e);
  }
}

export async function markNotificationsReadAction(): Promise<ActionResult> {
  try {
    const staff = await getStaff();
    if (!staff) return { ok: false, error: "Not signed in" };
    await db.notification.updateMany({ where: { OR: [{ userId: null }, { userId: staff.id }], readAt: null }, data: { readAt: new Date() } });
    revalidatePath("/admin", "layout");
    return { ok: true, message: "All caught up." };
  } catch (e) {
    return fail(e);
  }
}

export async function updateInquiryAction(id: string, status: "open" | "resolved"): Promise<ActionResult> {
  try {
    const staff = await staffAction("customers.read");
    await db.supportInquiry.update({ where: { id }, data: { status } });
    await audit({ actorId: staff.id, action: "inquiry.status", entityType: "inquiry", entityId: id, summary: status });
    revalidatePath("/admin/customers");
    return { ok: true, message: "Updated." };
  } catch (e) {
    return fail(e);
  }
}

/** Process an account deletion: erase personal data, anonymise orders (kept for accounting). */
export async function processDeletionAction(requestId: string): Promise<ActionResult> {
  try {
    const staff = await staffAction("staff.manage");
    const req = await db.dataDeletionRequest.findUniqueOrThrow({ where: { id: requestId }, include: { user: true } });
    if (req.user.kind === "STAFF") return { ok: false, error: "Staff accounts must be removed from Staff & roles." };
    const jobs = await db.tryOnJob.findMany({ where: { userId: req.userId, deletedAt: null } });
    for (const j of jobs) await deleteTryOnJobMedia(j.id);
    await db.$transaction([
      db.order.updateMany({ where: { userId: req.userId }, data: { userId: null, email: null } }),
      db.address.deleteMany({ where: { userId: req.userId } }),
      db.dataDeletionRequest.update({ where: { id: requestId }, data: { status: "completed", processedAt: new Date() } }),
      db.user.update({ where: { id: req.userId }, data: { isActive: false, name: "Deleted customer", email: `deleted-${req.userId}@invalid.local`, phone: null, passwordHash: "!" } }),
      db.session.deleteMany({ where: { userId: req.userId } }),
    ]);
    await audit({ actorId: staff.id, action: "privacy.account_deleted", entityType: "user", entityId: req.userId });
    revalidatePath("/admin/customers");
    return { ok: true, message: "Customer data deleted and orders anonymised." };
  } catch (e) {
    return fail(e);
  }
}
