import { z } from "zod";
import { json, route } from "@/lib/api";
import { findCart, priceCart, updateCartItem } from "@/lib/cart/server";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = route<Ctx>(async (req, { params }) => {
  const { quantity } = z.object({ quantity: z.number().int().min(0).max(10) }).parse(await req.json());
  await updateCartItem((await params).id, quantity);
  return json(await priceCart(await findCart()));
});

export const DELETE = route<Ctx>(async (_req, { params }) => {
  await updateCartItem((await params).id, 0);
  return json(await priceCart(await findCart()));
});
