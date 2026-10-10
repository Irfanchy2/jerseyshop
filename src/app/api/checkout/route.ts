import { cookies } from "next/headers";
import { json, route, HttpError } from "@/lib/api";
import { checkoutSchema, placeOrder } from "@/lib/checkout/place-order";
import { clientIp, getCustomer } from "@/lib/auth/session";
import { getLocale } from "@/lib/i18n/server";
import { rateLimit } from "@/lib/rate-limit";
import { startSslcommerzPayment } from "@/lib/payments/sslcommerz";

export const POST = route(async (req) => {
  if (!(await rateLimit(`checkout:${await clientIp()}`, 10, 600))) throw new HttpError(429, "Too many orders from this network. Please wait a few minutes.");
  const input = checkoutSchema.parse(await req.json());
  const user = await getCustomer();
  const { order, trackingToken } = await placeOrder(input, { userId: user?.id ?? null, locale: await getLocale() });
  if (trackingToken) {
    // Lets the confirmation page (and gateway return) show the order to this browser without an account.
    (await cookies()).set("js_last_order", `${order.number}.${trackingToken}`, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 });
  }
  const successUrl = `/checkout/success?order=${order.number}`;
  if (order.paymentMethod === "SSLCOMMERZ" && order.paymentStatus === "PENDING") {
    const redirect = await startSslcommerzPayment(order.id);
    return json({ orderNumber: order.number, redirect });
  }
  return json({ orderNumber: order.number, redirect: successUrl });
});
