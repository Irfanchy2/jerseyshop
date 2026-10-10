import { z } from "zod";
import { cookies } from "next/headers";
import { json, route } from "@/lib/api";
import { LOCALE_COOKIE } from "@/lib/i18n/server";

export const POST = route(async (req) => {
  const { locale } = z.object({ locale: z.enum(["en", "bn"]) }).parse(await req.json());
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return json({ ok: true });
});
