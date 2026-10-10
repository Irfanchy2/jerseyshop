"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCustomer } from "@/lib/auth/session";
import { normalizeBdPhone } from "@/lib/phone";
import { isValidDistrict } from "@/lib/bd-locations";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/auth/session";
import { notifyStaff } from "@/lib/notify";
import { deleteTryOnJobMedia } from "@/lib/tryon/service";
import type { FormState } from "@/lib/auth/actions";

async function me() {
  const u = await getCustomer();
  if (!u) throw new Error("Not signed in");
  return u;
}

const addressSchema = z.object({
  label: z.string().trim().max(30).default("Home"),
  name: z.string().trim().min(2).max(80),
  phone: z.string().refine((v) => !!normalizeBdPhone(v), "Invalid mobile number"),
  line1: z.string().trim().min(6).max(220),
  area: z.string().trim().min(2).max(80),
  division: z.string(),
  district: z.string(),
  postcode: z.string().trim().max(10).optional(),
  isDefault: z.boolean(),
}).refine((a) => isValidDistrict(a.division, a.district), { path: ["district"], message: "Choose a district in the selected division" });

export async function saveAddressAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await me();
  const parsed = addressSchema.safeParse({ ...Object.fromEntries(fd), isDefault: fd.get("isDefault") === "on" });
  if (!parsed.success) return { fieldErrors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])) };
  const data = { ...parsed.data, phone: normalizeBdPhone(parsed.data.phone)! };
  const id = fd.get("id") ? String(fd.get("id")) : null;
  await db.$transaction(async (tx) => {
    if (data.isDefault) await tx.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
    if (id) await tx.address.updateMany({ where: { id, userId: user.id }, data });
    else await tx.address.create({ data: { ...data, userId: user.id } });
  });
  revalidatePath("/account/addresses");
  return { ok: true, message: "Address saved." };
}

export async function deleteAddressAction(id: string) {
  const user = await me();
  await db.address.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/account/addresses");
}

export async function updateProfileAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await me();
  const name = String(fd.get("name") ?? "").trim();
  const phone = String(fd.get("phone") ?? "").trim();
  if (name.length < 2) return { fieldErrors: { name: "Enter your name" } };
  if (phone && !normalizeBdPhone(phone)) return { fieldErrors: { phone: "Invalid mobile number" } };
  const marketing = fd.get("marketing") === "on";
  await db.user.update({
    where: { id: user.id },
    data: {
      name, phone: phone ? normalizeBdPhone(phone) : null,
      profile: { upsert: { create: { marketingConsent: marketing, marketingConsentAt: marketing ? new Date() : null }, update: { marketingConsent: marketing, marketingConsentAt: marketing ? new Date() : null } } },
    },
  });
  revalidatePath("/account");
  return { ok: true, message: "Profile updated." };
}

const reviewSchema = z.object({
  productId: z.string(),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(80).optional(),
  body: z.string().trim().min(10, "Tell us a bit more (at least 10 characters)").max(1500),
});

/** Reviews are only accepted from customers with a delivered order containing the product. */
export async function submitReviewAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await me();
  const parsed = reviewSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])) };
  const item = await db.orderItem.findFirst({ where: { productId: parsed.data.productId, order: { userId: user.id, status: "DELIVERED" } } });
  if (!item) return { error: "You can review this jersey once your order has been delivered." };
  const existing = await db.review.findUnique({ where: { userId_productId: { userId: user.id, productId: parsed.data.productId } } });
  if (existing) return { error: "You've already reviewed this jersey." };
  await db.review.create({ data: { ...parsed.data, userId: user.id, orderItemId: item.id, status: "PENDING" } });
  await notifyStaff({ type: "review.new", title: "New review awaiting moderation", link: "/admin/reviews" });
  return { ok: true, message: "Thank you! Your review will appear after a quick moderation check." };
}

export async function requestDeletionAction(scope: "tryon_images" | "account") {
  const user = await me();
  if (scope === "tryon_images") {
    // Try-on images are deleted immediately; no manual processing needed.
    const jobs = await db.tryOnJob.findMany({ where: { userId: user.id, deletedAt: null } });
    for (const j of jobs) await deleteTryOnJobMedia(j.id);
    await db.dataDeletionRequest.create({ data: { userId: user.id, scope, status: "completed", processedAt: new Date() } });
  } else {
    await db.dataDeletionRequest.create({ data: { userId: user.id, scope } });
    await notifyStaff({ type: "privacy.deletion", title: "Account deletion requested", body: user.email, link: "/admin/customers" });
  }
  revalidatePath("/account/privacy");
}

export async function deleteDesignAction(id: string) {
  const user = await me();
  await db.customDesign.updateMany({ where: { id, userId: user.id }, data: { savedToAccount: false } });
  revalidatePath("/account/designs");
}

const inquirySchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  phone: z.string().trim().max(20).optional(),
  orderNumber: z.string().trim().max(20).optional(),
  subject: z.string().trim().min(3).max(120),
  message: z.string().trim().min(10).max(3000),
});

export async function contactAction(_: FormState, fd: FormData): Promise<FormState> {
  if (!(await rateLimit(`contact:${await clientIp()}`, 5, 3600))) return { error: "Too many messages. Please try again later." };
  const parsed = inquirySchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])) };
  const user = await getCustomer();
  await db.supportInquiry.create({ data: { ...parsed.data, userId: user?.id } });
  await notifyStaff({ type: "support.new", title: `Support: ${parsed.data.subject}`, body: parsed.data.email, link: "/admin/customers" });
  return { ok: true, message: "Thanks — we've received your message and will reply within one business day." };
}
