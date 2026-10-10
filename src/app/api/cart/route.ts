import { z } from "zod";
import { json, route } from "@/lib/api";
import { addToCart, findCart, priceCart } from "@/lib/cart/server";
import { track } from "@/lib/analytics";

export const GET = route(async (req) => {
  const district = new URL(req.url).searchParams.get("district");
  return json(await priceCart(await findCart(), { district }));
});

const addSchema = z.object({ variantId: z.string().min(1), quantity: z.number().int().min(1).max(10).default(1), customDesignId: z.string().nullish() });

export const POST = route(async (req) => {
  const body = addSchema.parse(await req.json());
  await addToCart(body.variantId, body.quantity, body.customDesignId);
  await track("add_to_cart", { props: { variantId: body.variantId, quantity: body.quantity, customized: !!body.customDesignId } });
  return json(await priceCart(await findCart()));
});
