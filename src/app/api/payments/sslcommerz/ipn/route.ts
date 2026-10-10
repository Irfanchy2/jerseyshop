import { validateSslcommerz } from "@/lib/payments/sslcommerz";

/** Server-to-server IPN. Trust nothing in the body: re-validate with the SSLCommerz validation API. */
export async function POST(req: Request) {
  const form = await req.formData();
  const valId = String(form.get("val_id") ?? "");
  const tranId = String(form.get("tran_id") ?? "");
  if (!valId || !tranId) return new Response("missing", { status: 400 });
  try {
    await validateSslcommerz(valId, tranId);
    return new Response("ok");
  } catch (e) {
    console.error("IPN validation failed", e);
    return new Response("error", { status: 500 });
  }
}
