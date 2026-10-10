import { z } from "zod";
import { json, route } from "@/lib/api";
import { findCart, priceCart, setCartCoupon } from "@/lib/cart/server";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/auth/session";
import { HttpError } from "@/lib/api";

export const POST = route(async (req) => {
  const { code, district } = z.object({ code: z.string().trim().max(40).nullable(), district: z.string().nullish() }).parse(await req.json());
  if (!(await rateLimit(`coupon:${await clientIp()}`, 20, 600))) throw new HttpError(429, "Too many attempts. Try again later.");
  await setCartCoupon(code || null);
  return json(await priceCart(await findCart(), { district }));
});
