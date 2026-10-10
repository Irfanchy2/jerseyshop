import { db } from "@/lib/db";
import { json, route, HttpError } from "@/lib/api";
import { getCustomer } from "@/lib/auth/session";
import { designInputSchema, validatePersonalisation } from "@/lib/customizer";
import { track } from "@/lib/analytics";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/auth/session";

/** Create an immutable personalisation record; the surcharge is always computed server-side from the template. */
export const POST = route(async (req) => {
  if (!(await rateLimit(`design:${await clientIp()}`, 60, 3600))) throw new HttpError(429, "Too many requests.");
  const input = designInputSchema.parse(await req.json());
  const product = await db.product.findFirst({ where: { id: input.productId, status: "ACTIVE", customizable: true }, include: { template: true } });
  if (!product?.template || !product.template.isActive) throw new HttpError(404, "This jersey can't be personalised.");
  const allowBase = product.kitType === "CUSTOM";
  const problem = validatePersonalisation({ ...input, baseColor: input.baseColor ?? null }, product.template, allowBase);
  if (problem) throw new HttpError(400, problem);
  const user = await getCustomer();
  if (input.save && !user) throw new HttpError(401, "Sign in to save designs to your account.");
  const design = await db.customDesign.create({
    data: {
      productId: product.id, templateId: product.template.id, userId: user?.id, playerName: input.playerName.trim().toUpperCase(), playerNumber: input.playerNumber,
      font: input.font, baseColor: allowBase && input.baseColor ? input.baseColor : "", textColor: input.textColor, surchargeMinor: product.template.priceMinor, savedToAccount: !!input.save,
    },
  });
  await track("customizer_save", { productId: product.id, userId: user?.id, props: { saved: !!input.save } });
  return json({ id: design.id, surchargeMinor: design.surchargeMinor });
});
