import { z } from "zod";
import { json, route, HttpError } from "@/lib/api";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/auth/session";
import { getLocale } from "@/lib/i18n/server";
import { track } from "@/lib/analytics";

export const POST = route(async (req) => {
  const { email, source } = z.object({ email: z.string().trim().toLowerCase().email().max(160), source: z.string().max(40).optional() }).parse(await req.json());
  if (!(await rateLimit(`newsletter:${await clientIp()}`, 5, 3600))) throw new HttpError(429, "Too many requests.");
  await db.newsletterSubscriber.upsert({
    where: { email },
    create: { email, source, locale: await getLocale() },
    update: { unsubscribedAt: null, consentAt: new Date() },
  });
  await track("newsletter_signup", { props: { source: source ?? "footer" } });
  return json({ ok: true });
});
