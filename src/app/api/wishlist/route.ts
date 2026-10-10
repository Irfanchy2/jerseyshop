import { z } from "zod";
import { json, route, HttpError } from "@/lib/api";
import { db } from "@/lib/db";
import { getCustomer } from "@/lib/auth/session";

/** Signed-in wishlist. Guests keep a local wishlist that merges on sign-in (POST with ids). */
export const GET = route(async () => {
  const user = await getCustomer();
  if (!user) return json({ ids: [] as string[], signedIn: false });
  const items = await db.wishlistItem.findMany({ where: { userId: user.id }, select: { productId: true } });
  return json({ ids: items.map((i) => i.productId), signedIn: true });
});

export const POST = route(async (req) => {
  const user = await getCustomer();
  if (!user) throw new HttpError(401, "Sign in to sync your wishlist");
  const { productIds, remove } = z.object({ productIds: z.array(z.string()).max(100), remove: z.boolean().optional() }).parse(await req.json());
  if (remove) await db.wishlistItem.deleteMany({ where: { userId: user.id, productId: { in: productIds } } });
  else {
    const valid = await db.product.findMany({ where: { id: { in: productIds } }, select: { id: true } });
    await db.wishlistItem.createMany({ data: valid.map((p) => ({ userId: user.id, productId: p.id })), skipDuplicates: true });
  }
  const items = await db.wishlistItem.findMany({ where: { userId: user.id }, select: { productId: true } });
  return json({ ids: items.map((i) => i.productId), signedIn: true });
});
