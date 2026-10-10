import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { dictionaries, type Locale } from "./dictionaries";

export const LOCALE_COOKIE = "locale";

export const getLocale = cache(async (): Promise<Locale> => {
  const v = (await cookies()).get(LOCALE_COOKIE)?.value;
  return v === "bn" ? "bn" : "en";
});

export async function getDictionary() {
  return dictionaries[await getLocale()];
}
