import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { randomToken, sha256 } from "@/lib/crypto";
import { placeOrder, type CheckoutInput } from "@/lib/checkout/place-order";
import { findCart, priceCart } from "@/lib/cart/server";
import { createShipment } from "@/lib/couriers/service";
import { withCookies } from "../support/setup";

async function cartWith(variantId: string, quantity = 1, couponCode?: string) {
  const token = randomToken(16);
  await db.cart.create({ data: { tokenHash: sha256(token), couponCode, items: { create: { variantId, quantity } } } });
  return new Map([["js_cart", token]]);
}

const checkout = (over: Partial<CheckoutInput> = {}): CheckoutInput => ({
  idempotencyKey: `test-${randomToken(12)}`,
  name: "Integration Tester",
  phone: `017${String(Math.floor(10000000 + Math.random() * 89999999))}`,
  line1: "House 1, Road 2, Dhanmondi",
  area: "Dhanmondi",
  district: "Dhaka",
  division: "Dhaka",
  paymentMethod: "COD",
  ...over,
});

let variantId: string;

beforeAll(async () => {
  const v = await db.productVariant.findFirstOrThrow({ where: { product: { slug: "dhaka-riverside-26-27-home-jersey" }, size: "M" } });
  variantId = v.id;
});

describe("checkout", () => {
  it("prices the cart on the server, including delivery by district", async () => {
    const jar = await cartWith(variantId, 1);
    const priced = await withCookies(jar, async () => priceCart(await findCart(), { district: "Sylhet" }));
    expect(priced.subtotalMinor).toBe(189000);
    expect(priced.shipping.code).toBe("outside_dhaka");
    expect(priced.totalMinor).toBe(189000 + 13000);
  });

  it("never oversells when two customers buy the last unit concurrently", async () => {
    await db.productVariant.update({ where: { id: variantId }, data: { stock: 1 } });
    const [a, b] = [await cartWith(variantId), await cartWith(variantId)];
    const results = await Promise.allSettled([
      withCookies(a, () => placeOrder(checkout(), { userId: null, locale: "en" })),
      withCookies(b, () => placeOrder(checkout(), { userId: null, locale: "en" })),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
    const v = await db.productVariant.findUniqueOrThrow({ where: { id: variantId } });
    expect(v.stock).toBe(0);
  });

  it("returns the same order for a repeated submission (idempotency)", async () => {
    await db.productVariant.update({ where: { id: variantId }, data: { stock: 10 } });
    const jar = await cartWith(variantId);
    const input = checkout();
    const first = await withCookies(jar, () => placeOrder(input, { userId: null, locale: "en" }));
    const again = await withCookies(jar, () => placeOrder(input, { userId: null, locale: "en" }));
    expect(again.order.id).toBe(first.order.id);
    expect(again.duplicate).toBe(true);
    expect(await db.order.count({ where: { idempotencyKey: input.idempotencyKey } })).toBe(1);
  });

  it("stores money as integers and snapshots personalisation on the order", async () => {
    const product = await db.product.findUniqueOrThrow({ where: { slug: "studio-custom-team-jersey" }, include: { template: true, variants: true } });
    const design = await db.customDesign.create({ data: { productId: product.id, templateId: product.templateId!, playerName: "TEST", playerNumber: "9", font: "block", baseColor: "", textColor: "#ffffff", surchargeMinor: product.template!.priceMinor } });
    const token = randomToken(16);
    await db.cart.create({ data: { tokenHash: sha256(token), items: { create: { variantId: product.variants.find((v) => v.stock > 0)!.id, quantity: 2, customDesignId: design.id } } } });
    const { order } = await withCookies(new Map([["js_cart", token]]), () => placeOrder(checkout(), { userId: null, locale: "en" }));
    const item = await db.orderItem.findFirstOrThrow({ where: { orderId: order.id } });
    expect(item.customization).toMatchObject({ playerName: "TEST", playerNumber: "9", font: "block" });
    expect(order.customizationMinor).toBe(product.template!.priceMinor * 2);
    expect(Number.isInteger(order.totalMinor)).toBe(true);
  });

  it("enforces coupon usage limits under concurrency", async () => {
    const oneUse = `ONEUSE${randomToken(4).toUpperCase().replace(/[^A-Z0-9]/g, "X")}`;
    await db.coupon.create({ data: { code: oneUse, type: "FIXED", value: 10000, usageLimit: 1 } });
    await db.productVariant.update({ where: { id: variantId }, data: { stock: 10 } });
    const [a, b] = [await cartWith(variantId, 1, oneUse), await cartWith(variantId, 1, oneUse)];
    const results = await Promise.allSettled([
      withCookies(a, () => placeOrder(checkout(), { userId: null, locale: "en" })),
      withCookies(b, () => placeOrder(checkout(), { userId: null, locale: "en" })),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await db.coupon.findUniqueOrThrow({ where: { code: oneUse } })).usedCount).toBe(1);
  });
});

describe("courier booking", () => {
  it("creates exactly one mock shipment even with concurrent requests", async () => {
    await db.shippingProvider.update({ where: { code: "steadfast" }, data: { isEnabled: true, mode: "MOCK" } });
    await db.productVariant.update({ where: { id: variantId }, data: { stock: 10 } });
    const { order } = await withCookies(await cartWith(variantId), () => placeOrder(checkout(), { userId: null, locale: "en" }));
    await db.order.update({ where: { id: order.id }, data: { status: "CONFIRMED" } });
    const results = await Promise.allSettled([createShipment(order.id, "steadfast", null), createShipment(order.id, "steadfast", null), createShipment(order.id, "steadfast", null)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const shipments = await db.shipment.findMany({ where: { orderId: order.id } });
    expect(shipments).toHaveLength(1);
    expect(shipments[0]).toMatchObject({ status: "BOOKED", mode: "MOCK" });
    expect(shipments[0].consignmentId).toMatch(/^MOCK-/);
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("READY_TO_SHIP");
  });

  it("refuses to book unconfirmed orders and records failed bookings honestly", async () => {
    const { order } = await withCookies(await cartWith(variantId), () => placeOrder(checkout(), { userId: null, locale: "en" }));
    await expect(createShipment(order.id, "steadfast", null)).rejects.toThrow(/confirmed/);
    // The mock adapter rejects this test phone, simulating a courier-side failure.
    await db.order.update({ where: { id: order.id }, data: { status: "CONFIRMED" } });
    await db.orderAddress.update({ where: { orderId: order.id }, data: { phone: "01000000000" } });
    await expect(createShipment(order.id, "steadfast", null)).rejects.toThrow(/failed/i);
    const s = await db.shipment.findFirstOrThrow({ where: { orderId: order.id } });
    expect(s.status).toBe("FAILED");
    expect(s.consignmentId).toBeNull();
  });
});
