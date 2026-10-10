import { json, route } from "@/lib/api";
import { searchCatalog } from "@/lib/catalog/queries";
import { getLocale } from "@/lib/i18n/server";

export const GET = route(async (req) => {
  const q = new URL(req.url).searchParams.get("q")?.slice(0, 80) ?? "";
  if (q.trim().length < 2) return json({ items: [], total: 0 });
  const r = await searchCatalog({ q, perPage: 6, sort: "featured" }, await getLocale());
  return json({ items: r.items, total: r.total });
});

