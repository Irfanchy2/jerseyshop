import { json, route } from "@/lib/api";
import { getProductsByIds } from "@/lib/catalog/queries";
import { getLocale } from "@/lib/i18n/server";

export const GET = route(async (req) => {
  const ids = (new URL(req.url).searchParams.get("ids") ?? "").split(",").filter(Boolean).slice(0, 24);
  return json({ items: await getProductsByIds(ids, await getLocale()) });
});
