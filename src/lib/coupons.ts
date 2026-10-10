import "server-only";
import type { Coupon } from "@prisma/client";
import { db } from "@/lib/db";
import { percentOf } from "@/lib/money";

export type CouponResult =
  | { ok: true; coupon: Coupon; discountMinor: number; freeShipping: boolean }
  | { ok: false; reason: string };

/** Validates a coupon against a subtotal (and optionally the customer phone for per-customer limits). */
export async function evaluateCoupon(code: string, subtotalMinor: number, phone?: string | null): Promise<CouponResult> {
  const coupon = await db.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
  const now = new Date();
  if (!coupon || !coupon.isActive) return { ok: false, reason: "This code isn't valid." };
  if (coupon.startsAt && coupon.startsAt > now) return { ok: false, reason: "This code isn't active yet." };
  if (coupon.endsAt && coupon.endsAt <= now) return { ok: false, reason: "This code has expired." };
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) return { ok: false, reason: "This code has reached its usage limit." };
  if (subtotalMinor < coupon.minSubtotalMinor)
    return { ok: false, reason: `Spend at least ৳${Math.ceil(coupon.minSubtotalMinor / 100).toLocaleString("en-IN")} to use this code.` };
  if (phone && coupon.perCustomerLimit != null) {
    const used = await db.couponRedemption.count({ where: { couponId: coupon.id, phone } });
    if (used >= coupon.perCustomerLimit) return { ok: false, reason: "You've already used this code." };
  }
  let discount = 0;
  if (coupon.type === "PERCENT") discount = percentOf(subtotalMinor, Math.min(100, coupon.value));
  if (coupon.type === "FIXED") discount = coupon.value;
  if (coupon.maxDiscountMinor != null) discount = Math.min(discount, coupon.maxDiscountMinor);
  discount = Math.min(discount, subtotalMinor);
  return { ok: true, coupon, discountMinor: discount, freeShipping: coupon.type === "FREE_SHIPPING" };
}
