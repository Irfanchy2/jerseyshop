import "server-only";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { findCart, priceCart } from "@/lib/cart/server";
import { normalizeBdPhone } from "@/lib/phone";
import { isValidDistrict } from "@/lib/bd-locations";
import { randomToken, sha256 } from "@/lib/crypto";
import { HttpError } from "@/lib/api";
import { getSettings } from "@/lib/settings";
import { notifyStaff } from "@/lib/notify";
import { track } from "@/lib/analytics";
import { formatMoney } from "@/lib/money";

export const checkoutSchema = z.object({
  idempotencyKey: z.string().min(16).max(80),
  name: z.string().trim().min(2, "Enter your full name").max(80),
  phone: z.string().trim().refine((v) => normalizeBdPhone(v) !== null, "Enter a valid Bangladesh mobile number (01XXXXXXXXX)"),
  altPhone: z.string().trim().optional().refine((v) => !v || normalizeBdPhone(v) !== null, "Enter a valid mobile number"),
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email")]).optional(),
  line1: z.string().trim().min(6, "Add house, road and area details").max(220),
  area: z.string().trim().min(2, "Enter your area or thana").max(80),
  district: z.string().trim().min(2),
  division: z.string().trim().min(2),
  postcode: z.string().trim().max(10).optional(),
  notes: z.string().trim().max(500).optional(),
  paymentMethod: z.enum(["COD", "SSLCOMMERZ"]),
  couponCode: z.string().trim().max(40).optional(),
  marketingConsent: z.boolean().optional(),
}).refine((v) => isValidDistrict(v.division, v.district), { message: "Choose a district in the selected division", path: ["district"] });

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export async function placeOrder(input: CheckoutInput, ctx: { userId: string | null; locale: string }) {
  const data = checkoutSchema.parse(input);

  // Idempotency: a retried submission returns the original order instead of creating a duplicate.
  const prior = await db.order.findUnique({ where: { idempotencyKey: data.idempotencyKey } });
  if (prior) return { order: prior, trackingToken: null as string | null, duplicate: true };

  const settings = await getSettings();
  if (data.paymentMethod === "COD" && !settings.payments.codEnabled) throw new HttpError(400, "Cash on Delivery is currently unavailable.");
  if (data.paymentMethod === "SSLCOMMERZ" && !settings.payments.sslcommerzEnabled) throw new HttpError(400, "Online payment is currently unavailable.");

  const cart = await findCart();
  if (!cart || cart.items.length === 0) throw new HttpError(400, "Your bag is empty.");
  const phone = normalizeBdPhone(data.phone)!;
  const priced = await priceCart(cart, { district: data.district, phone, couponCode: data.couponCode || cart.couponCode });
  if (priced.coupon && !priced.coupon.valid) throw new HttpError(400, priced.coupon.message ?? "Invalid discount code", "coupon");
  const unavailable = priced.lines.find((l) => !l.available);
  if (unavailable) throw new HttpError(409, `${unavailable.name} (${unavailable.size}) no longer has enough stock. Please update your bag.`, "stock");
  if (data.paymentMethod === "COD" && priced.totalMinor > settings.payments.codMaxOrderMinor)
    throw new HttpError(400, `Cash on Delivery is available for orders up to ${formatMoney(settings.payments.codMaxOrderMinor)}.`);

  const trackingToken = randomToken(18);

  try {
    const order = await db.$transaction(
      async (tx) => {
        // Atomic conditional decrements prevent overselling under concurrency.
        for (const l of priced.lines) {
          const res = await tx.productVariant.updateMany({
            where: { id: l.variantId, stock: { gte: l.quantity }, isActive: true },
            data: { stock: { decrement: l.quantity } },
          });
          if (res.count !== 1) throw new HttpError(409, `${l.name} (${l.size}) just sold out. Please update your bag.`, "stock");
        }

        let couponId: string | null = null;
        if (priced.coupon?.valid) {
          const c = await tx.coupon.findUniqueOrThrow({ where: { code: priced.coupon.code } });
          const inc = await tx.coupon.updateMany({
            where: { id: c.id, OR: [{ usageLimit: null }, { usedCount: { lt: c.usageLimit ?? 0 } }] },
            data: { usedCount: { increment: 1 } },
          });
          if (inc.count !== 1) throw new HttpError(409, "This discount code has just reached its usage limit.", "coupon");
          couponId = c.id;
        }

        const [{ nextval }] = await tx.$queryRaw<{ nextval: bigint }[]>`SELECT nextval('order_number_seq')`;
        const created = await tx.order.create({
          data: {
            number: `JS-${nextval}`,
            userId: ctx.userId,
            email: data.email || null,
            phone,
            customerName: data.name,
            paymentMethod: data.paymentMethod,
            paymentStatus: data.paymentMethod === "COD" ? "UNPAID" : "PENDING",
            subtotalMinor: priced.subtotalMinor,
            customizationMinor: priced.customizationMinor,
            discountMinor: priced.discountMinor,
            shippingMinor: priced.shipping.feeMinor,
            totalMinor: priced.totalMinor,
            couponCode: priced.coupon?.valid ? priced.coupon.code : null,
            shippingRateCode: priced.shipping.code,
            notes: data.notes || null,
            locale: ctx.locale,
            idempotencyKey: data.idempotencyKey,
            trackingTokenHash: sha256(trackingToken),
            items: {
              create: priced.lines.map((l) => ({
                productId: l.productId,
                variantId: l.variantId,
                productName: l.name,
                sku: l.sku,
                size: l.size,
                color: l.color,
                imageUrl: l.image,
                unitPriceMinor: l.unitPriceMinor,
                quantity: l.quantity,
                customizationMinor: l.customizationMinor,
                customDesignId: l.customDesignId,
                customization: l.customization ?? undefined,
                lineTotalMinor: l.lineTotalMinor,
              })),
            },
            address: {
              create: {
                name: data.name, phone, altPhone: data.altPhone ? normalizeBdPhone(data.altPhone) : null,
                line1: data.line1, area: data.area, district: data.district, division: data.division, postcode: data.postcode || null,
              },
            },
            events: { create: { status: "PENDING" } },
          },
        });

        const variants = await tx.productVariant.findMany({ where: { id: { in: priced.lines.map((l) => l.variantId) } }, select: { id: true, stock: true } });
        await tx.inventoryMovement.createMany({
          data: priced.lines.map((l) => ({
            variantId: l.variantId, delta: -l.quantity, reason: "order", orderId: created.id,
            stockAfter: variants.find((v) => v.id === l.variantId)?.stock ?? 0,
          })),
        });
        if (couponId) await tx.couponRedemption.create({ data: { couponId, orderId: created.id, phone, amountMinor: priced.couponDiscountMinor } });
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
        await tx.cart.update({ where: { id: cart.id }, data: { couponCode: null, convertedOrderId: created.id } });

        if (ctx.userId && data.marketingConsent) {
          await tx.customerProfile.upsert({
            where: { userId: ctx.userId },
            create: { userId: ctx.userId, marketingConsent: true, marketingConsentAt: new Date() },
            update: { marketingConsent: true, marketingConsentAt: new Date() },
          });
        }
        return created;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 15000 },
    );

    await notifyStaff({ type: "order.new", title: `New order ${order.number}`, body: `${order.customerName} · ${formatMoney(order.totalMinor)} · ${order.paymentMethod}`, link: `/admin/orders/${order.id}` });
    await track("purchase", { orderId: order.id, userId: ctx.userId, props: { value: order.totalMinor, items: priced.itemCount } });
    return { order, trackingToken, duplicate: false };
  } catch (e) {
    // Unique-constraint race on the idempotency key: another request created it first.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const again = await db.order.findUnique({ where: { idempotencyKey: data.idempotencyKey } });
      if (again) return { order: again, trackingToken: null, duplicate: true };
    }
    throw e;
  }
}

/** Return stock for every line of an order (used on cancellation / failed payment). */
export async function restockOrder(tx: Prisma.TransactionClient, orderId: string, reason: string, actorId?: string | null) {
  const items = await tx.orderItem.findMany({ where: { orderId, variantId: { not: null } } });
  for (const it of items) {
    const v = await tx.productVariant.update({ where: { id: it.variantId! }, data: { stock: { increment: it.quantity } } });
    await tx.inventoryMovement.create({ data: { variantId: v.id, delta: it.quantity, reason, orderId, actorId: actorId ?? null, stockAfter: v.stock } });
  }
}
