import "server-only";
import { cookies } from "next/headers";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { randomToken, sha256 } from "@/lib/crypto";
import { getCustomer } from "@/lib/auth/session";
import { effectivePrice } from "@/lib/catalog/pricing";
import { evaluateCoupon } from "@/lib/coupons";
import { getSettings } from "@/lib/settings";
import { percentOf } from "@/lib/money";
import { HttpError } from "@/lib/api";

export const CART_COOKIE = "js_cart";

export const cartInclude = {
  items: {
    orderBy: { createdAt: "asc" },
    include: {
      variant: { include: { product: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, bundleItems: true } } } },
      customDesign: true,
    },
  },
} satisfies Prisma.CartInclude;

export type CartWithItems = Prisma.CartGetPayload<{ include: typeof cartInclude }>;

export async function findCart(): Promise<CartWithItems | null> {
  const token = (await cookies()).get(CART_COOKIE)?.value;
  if (!token) return null;
  return db.cart.findUnique({ where: { tokenHash: sha256(token) }, include: cartInclude });
}

export async function getOrCreateCart(): Promise<CartWithItems> {
  const existing = await findCart();
  const user = await getCustomer();
  if (existing) {
    if (user && !existing.userId) await db.cart.update({ where: { id: existing.id }, data: { userId: user.id } });
    return existing;
  }
  const token = randomToken(24);
  const cart = await db.cart.create({ data: { tokenHash: sha256(token), userId: user?.id }, include: cartInclude });
  (await cookies()).set(CART_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 60,
  });
  return cart;
}

export async function addToCart(variantId: string, quantity: number, customDesignId?: string | null) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) throw new HttpError(400, "Invalid quantity");
  const variant = await db.productVariant.findUnique({ where: { id: variantId }, include: { product: true } });
  if (!variant || !variant.isActive || variant.product.status !== "ACTIVE") throw new HttpError(404, "This item is no longer available.");
  const cart = await getOrCreateCart();
  if (customDesignId) {
    const design = await db.customDesign.findUnique({ where: { id: customDesignId } });
    if (!design || design.productId !== variant.productId) throw new HttpError(400, "Invalid personalisation.");
  }
  const existing = cart.items.find((i) => i.variantId === variantId && (i.customDesignId ?? null) === (customDesignId ?? null));
  const nextQty = (existing?.quantity ?? 0) + quantity;
  if (nextQty > variant.stock) throw new HttpError(409, variant.stock > 0 ? `Only ${variant.stock} left in size ${variant.size}.` : "This size is out of stock.");
  if (existing) await db.cartItem.update({ where: { id: existing.id }, data: { quantity: nextQty } });
  else await db.cartItem.create({ data: { cartId: cart.id, variantId, quantity, customDesignId: customDesignId ?? null } });
  await db.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } });
}

export async function updateCartItem(itemId: string, quantity: number) {
  const cart = await findCart();
  const item = cart?.items.find((i) => i.id === itemId);
  if (!cart || !item) throw new HttpError(404, "Item not found");
  if (quantity <= 0) {
    await db.cartItem.delete({ where: { id: itemId } });
    return;
  }
  if (quantity > 10) throw new HttpError(400, "Maximum 10 per item");
  if (quantity > item.variant.stock) throw new HttpError(409, `Only ${item.variant.stock} available.`);
  await db.cartItem.update({ where: { id: itemId }, data: { quantity } });
}

export async function setCartCoupon(code: string | null) {
  const cart = await getOrCreateCart();
  await db.cart.update({ where: { id: cart.id }, data: { couponCode: code ? code.trim().toUpperCase() : null } });
}

export type ShippingQuote = { code: string; name: string; nameBn: string | null; feeMinor: number; etaText: string };

export async function shippingRateFor(district: string | null | undefined): Promise<ShippingQuote> {
  const rates = await db.shippingRate.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
  const rate = (district && rates.find((r) => r.districts.includes(district))) || rates.find((r) => r.districts.length === 0) || rates[0];
  if (!rate) return { code: "standard", name: "Standard", nameBn: null, feeMinor: 0, etaText: "" };
  return { code: rate.code, name: rate.name, nameBn: rate.nameBn, feeMinor: rate.feeMinor, etaText: rate.etaText };
}

export type PricedLine = {
  id: string;
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  nameBn: string | null;
  image: string | null;
  size: string;
  color: string;
  sku: string;
  quantity: number;
  stock: number;
  unitPriceMinor: number;
  originalUnitMinor: number | null;
  customizationMinor: number; // per unit
  customization: { playerName: string; playerNumber: string; font: string; baseColor: string; textColor: string } | null;
  customDesignId: string | null;
  lineTotalMinor: number;
  available: boolean;
};

export type PricedCart = {
  lines: PricedLine[];
  itemCount: number;
  subtotalMinor: number; // merchandise
  customizationMinor: number;
  bundleDiscountMinor: number;
  couponDiscountMinor: number;
  discountMinor: number;
  coupon: { code: string; valid: boolean; message: string | null; freeShipping: boolean } | null;
  shipping: ShippingQuote & { freeApplied: boolean };
  freeShippingThresholdMinor: number | null;
  totalMinor: number;
};

/**
 * Authoritative pricing used by the cart drawer, checkout summary and order placement.
 * Clients never send prices; everything is recomputed from the database.
 */
export async function priceCart(
  cart: CartWithItems | null,
  opts: { district?: string | null; phone?: string | null; couponCode?: string | null } = {},
): Promise<PricedCart> {
  const settings = await getSettings();
  const lines: PricedLine[] = (cart?.items ?? []).map((i) => {
    const p = i.variant.product;
    const price = effectivePrice(p, i.variant.priceMinor);
    const d = i.customDesign;
    const customizationMinor = d ? d.surchargeMinor : 0;
    return {
      id: i.id,
      variantId: i.variantId,
      productId: p.id,
      slug: p.slug,
      name: p.name,
      nameBn: p.nameBn,
      image: p.images[0]?.url ?? null,
      size: i.variant.size,
      color: i.variant.color,
      sku: i.variant.sku,
      quantity: i.quantity,
      stock: i.variant.stock,
      unitPriceMinor: price.price,
      originalUnitMinor: price.original,
      customizationMinor,
      customization: d ? { playerName: d.playerName, playerNumber: d.playerNumber, font: d.font, baseColor: d.baseColor, textColor: d.textColor } : null,
      customDesignId: i.customDesignId,
      lineTotalMinor: (price.price + customizationMinor) * i.quantity,
      available: p.status === "ACTIVE" && i.variant.isActive && i.variant.stock >= i.quantity,
    };
  });

  const subtotalMinor = lines.reduce((s, l) => s + l.unitPriceMinor * l.quantity, 0);
  const customizationMinor = lines.reduce((s, l) => s + l.customizationMinor * l.quantity, 0);

  // Bundles: when every product of an active bundle is in the cart, discount one unit of each.
  let bundleDiscountMinor = 0;
  const productIds = new Set(lines.map((l) => l.productId));
  if (productIds.size > 1) {
    const bundles = await db.bundle.findMany({ where: { isActive: true }, include: { items: true } });
    for (const b of bundles) {
      if (b.items.length > 1 && b.items.every((it) => productIds.has(it.productId))) {
        const unitSum = b.items.reduce((s, it) => s + (lines.find((l) => l.productId === it.productId)?.unitPriceMinor ?? 0), 0);
        bundleDiscountMinor += percentOf(unitSum, b.discountPercent);
      }
    }
  }

  const code = opts.couponCode ?? cart?.couponCode ?? null;
  let coupon: PricedCart["coupon"] = null;
  let couponDiscountMinor = 0;
  let freeShipCoupon = false;
  if (code) {
    const r = await evaluateCoupon(code, subtotalMinor - bundleDiscountMinor, opts.phone);
    if (r.ok) {
      couponDiscountMinor = r.discountMinor;
      freeShipCoupon = r.freeShipping;
      coupon = { code: r.coupon.code, valid: true, message: r.coupon.description, freeShipping: r.freeShipping };
    } else coupon = { code, valid: false, message: r.reason, freeShipping: false };
  }

  const discountMinor = Math.min(subtotalMinor, bundleDiscountMinor + couponDiscountMinor);
  const rate = await shippingRateFor(opts.district);
  const threshold = settings.delivery.freeShippingThresholdMinor;
  const merchandiseAfterDiscount = subtotalMinor - discountMinor;
  const freeApplied = freeShipCoupon || (threshold != null && merchandiseAfterDiscount >= threshold);
  const shippingFee = lines.length === 0 || freeApplied ? 0 : rate.feeMinor;

  return {
    lines,
    itemCount: lines.reduce((s, l) => s + l.quantity, 0),
    subtotalMinor,
    customizationMinor,
    bundleDiscountMinor,
    couponDiscountMinor,
    discountMinor,
    coupon,
    shipping: { ...rate, feeMinor: shippingFee, freeApplied },
    freeShippingThresholdMinor: threshold,
    totalMinor: subtotalMinor + customizationMinor - discountMinor + shippingFee,
  };
}
