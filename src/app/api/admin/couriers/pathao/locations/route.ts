import { db } from "@/lib/db";
import { json, route, HttpError } from "@/lib/api";
import { requirePermission } from "@/lib/auth/session";
import { decryptJson } from "@/lib/crypto";
import { pathaoLocations, type PathaoCreds } from "@/lib/couriers/pathao";

export const GET = route(async (req) => {
  await requirePermission("shipping.write");
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") as "cities" | "zones" | "areas";
  const parent = Number(url.searchParams.get("parent")) || undefined;
  if (!["cities", "zones", "areas"].includes(kind)) throw new HttpError(400, "Invalid kind");
  const p = await db.shippingProvider.findUniqueOrThrow({ where: { code: "pathao" } });
  if (p.mode === "MOCK" || !p.encryptedConfig) throw new HttpError(400, "Pathao credentials are not configured.");
  const cfg = p.publicConfig as Record<string, unknown>;
  const rows = await pathaoLocations(decryptJson<PathaoCreds>(p.encryptedConfig), { environment: p.mode === "LIVE" ? "production" : "sandbox", storeId: Number(cfg.storeId) || null, deliveryType: 48, itemType: 2, itemWeightKg: 0.5 }, kind, parent);
  const key = kind === "cities" ? ["city_id", "city_name"] : kind === "zones" ? ["zone_id", "zone_name"] : ["area_id", "area_name"];
  return json({ items: rows.map((r) => ({ id: Number(r[key[0]]), name: String(r[key[1]]) })) });
});
