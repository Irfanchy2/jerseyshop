import "server-only";
import { db } from "@/lib/db";
import { getSecret } from "@/lib/secrets";
import { getSettings } from "@/lib/settings";
import { toMajorString } from "@/lib/money";
import { randomToken } from "@/lib/crypto";
import { HttpError } from "@/lib/api";
import { restockOrder } from "@/lib/checkout/place-order";

/**
 * SSLCommerz hosted checkout (cards, bKash, Nagad, Rocket...).
 * Flow: create session → redirect customer → IPN/success callback → server-side validation API → mark paid.
 * A payment is only marked PAID after the validation API confirms status VALID/VALIDATED with a matching amount.
 */
type Creds = { storeId: string; storePassword: string };

const hosts = (sandbox: boolean) =>
  sandbox
    ? { session: "https://sandbox.sslcommerz.com/gwprocess/v4/api.php", validate: "https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php" }
    : { session: "https://securepay.sslcommerz.com/gwprocess/v4/api.php", validate: "https://securepay.sslcommerz.com/validator/api/validationserverAPI.php" };

async function config() {
  const s = await getSettings();
  const creds = await getSecret<Creds>("payments.sslcommerz");
  if (!s.payments.sslcommerzEnabled || !creds?.storeId || !creds.storePassword) throw new HttpError(503, "Online payment is not configured.");
  return { creds, sandbox: s.payments.sslcommerzSandbox };
}

export async function startSslcommerzPayment(orderId: string): Promise<string> {
  const { creds, sandbox } = await config();
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { address: true, items: true } });
  const tranId = `${order.number}-${randomToken(6)}`;
  await db.payment.create({ data: { orderId, provider: "SSLCOMMERZ", amountMinor: order.totalMinor, tranId } });
  const base = process.env.APP_URL ?? "http://localhost:3000";
  const form = new URLSearchParams({
    store_id: creds.storeId,
    store_passwd: creds.storePassword,
    total_amount: toMajorString(order.totalMinor),
    currency: "BDT",
    tran_id: tranId,
    success_url: `${base}/api/payments/sslcommerz/return?result=success`,
    fail_url: `${base}/api/payments/sslcommerz/return?result=fail`,
    cancel_url: `${base}/api/payments/sslcommerz/return?result=cancel`,
    ipn_url: `${base}/api/payments/sslcommerz/ipn`,
    cus_name: order.customerName,
    cus_email: order.email ?? "customer@example.com",
    cus_add1: order.address?.line1 ?? "",
    cus_city: order.address?.district ?? "",
    cus_country: "Bangladesh",
    cus_phone: order.phone,
    shipping_method: "Courier",
    num_of_item: String(order.items.reduce((s, i) => s + i.quantity, 0)),
    product_name: order.items.map((i) => i.productName).join(", ").slice(0, 250),
    product_category: "Apparel",
    product_profile: "physical-goods",
    ship_name: order.address?.name ?? order.customerName,
    ship_add1: order.address?.line1 ?? "",
    ship_city: order.address?.district ?? "",
    ship_postcode: order.address?.postcode ?? "1000",
    ship_country: "Bangladesh",
    value_a: order.id,
  });
  const res = await fetch(hosts(sandbox).session, { method: "POST", body: form, signal: AbortSignal.timeout(20000) });
  const data = (await res.json().catch(() => null)) as { status?: string; GatewayPageURL?: string; failedreason?: string } | null;
  if (!res.ok || data?.status !== "SUCCESS" || !data.GatewayPageURL) {
    await db.payment.update({ where: { tranId }, data: { status: "FAILED", raw: { failedreason: data?.failedreason ?? `HTTP ${res.status}` } } });
    throw new HttpError(502, "Could not start online payment. Please choose Cash on Delivery or try again.");
  }
  return data.GatewayPageURL;
}

/** Validates a transaction with SSLCommerz and updates payment/order state. Idempotent. */
export async function validateSslcommerz(valId: string, tranId: string) {
  const { creds, sandbox } = await config();
  const payment = await db.payment.findUnique({ where: { tranId }, include: { order: true } });
  if (!payment) throw new HttpError(404, "Unknown transaction");
  if (payment.status === "PAID") return payment;
  const url = `${hosts(sandbox).validate}?${new URLSearchParams({ val_id: valId, store_id: creds.storeId, store_passwd: creds.storePassword, format: "json" })}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  const v = (await res.json().catch(() => null)) as { status?: string; tran_id?: string; amount?: string; currency?: string; bank_tran_id?: string } | null;
  const amountOk = v?.amount != null && Math.round(Number(v.amount) * 100) === payment.amountMinor && v.currency === "BDT";
  const valid = (v?.status === "VALID" || v?.status === "VALIDATED") && v.tran_id === tranId && amountOk;
  if (!valid) {
    await db.payment.update({ where: { tranId }, data: { status: "FAILED", raw: (v ?? {}) as object } });
    return null;
  }
  return db.$transaction(async (tx) => {
    const updated = await tx.payment.update({ where: { tranId }, data: { status: "PAID", providerRef: v!.bank_tran_id ?? valId, validatedAt: new Date(), raw: v as object } });
    await tx.order.update({ where: { id: payment.orderId }, data: { paymentStatus: "PAID" } });
    await tx.orderStatusEvent.create({ data: { orderId: payment.orderId, status: payment.order.status, note: "Online payment confirmed by SSLCommerz", isPublic: true } });
    return updated;
  });
}

/** Called when the customer fails/cancels payment: cancel the unpaid order and return stock. */
export async function failSslcommerz(tranId: string) {
  const payment = await db.payment.findUnique({ where: { tranId }, include: { order: true } });
  if (!payment || payment.status === "PAID" || payment.order.status === "CANCELLED") return payment?.order ?? null;
  await db.$transaction(async (tx) => {
    await tx.payment.update({ where: { tranId }, data: { status: "FAILED" } });
    await tx.order.update({ where: { id: payment.orderId }, data: { status: "CANCELLED", paymentStatus: "FAILED", cancelledAt: new Date() } });
    await tx.orderStatusEvent.create({ data: { orderId: payment.orderId, status: "CANCELLED", note: "Online payment was not completed" } });
    await restockOrder(tx, payment.orderId, "payment_failed");
  });
  return payment.order;
}
