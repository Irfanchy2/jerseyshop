import { db } from "@/lib/db";
import { failSslcommerz, validateSslcommerz } from "@/lib/payments/sslcommerz";

/** Customer browser return (POST from the gateway). */
export async function POST(req: Request) {
  const result = new URL(req.url).searchParams.get("result");
  const form = await req.formData();
  const tranId = String(form.get("tran_id") ?? "");
  const valId = String(form.get("val_id") ?? "");
  const base = process.env.APP_URL ?? new URL(req.url).origin;
  const payment = tranId ? await db.payment.findUnique({ where: { tranId }, include: { order: true } }) : null;
  if (!payment) return Response.redirect(`${base}/checkout?payment=unknown`, 303);
  if (result === "success" && valId) {
    const ok = await validateSslcommerz(valId, tranId).catch(() => null);
    if (ok) return Response.redirect(`${base}/checkout/success?order=${payment.order.number}&paid=1`, 303);
  }
  await failSslcommerz(tranId);
  return Response.redirect(`${base}/checkout?payment=${result === "cancel" ? "cancelled" : "failed"}`, 303);
}
