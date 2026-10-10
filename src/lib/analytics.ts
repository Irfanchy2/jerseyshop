import "server-only";
import type { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

export const ANALYTICS_COOKIE = "js_sid";
export const TRACKABLE_EVENTS = [
  "page_view", "product_view", "add_to_cart", "begin_checkout", "purchase", "search",
  "tryon_open", "tryon_generate", "tryon_success", "customizer_open", "customizer_save", "newsletter_signup", "wishlist_add",
] as const;
export type TrackableEvent = (typeof TRACKABLE_EVENTS)[number];

/** First-party analytics. Only an anonymous random session id is used — no personal data. */
export async function track(name: TrackableEvent, data: { userId?: string | null; productId?: string | null; orderId?: string | null; path?: string | null; props?: Prisma.InputJsonValue; utmSource?: string | null; utmCampaign?: string | null } = {}) {
  try {
    const sid = (await cookies()).get(ANALYTICS_COOKIE)?.value ?? null;
    await db.analyticsEvent.create({ data: { name, sessionId: sid, ...data } });
  } catch (e) {
    console.error("track failed", e);
  }
}
