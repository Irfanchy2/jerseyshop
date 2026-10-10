import { z } from "zod";
import { json, route } from "@/lib/api";
import { track, TRACKABLE_EVENTS } from "@/lib/analytics";
import { getCustomer } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/auth/session";

const schema = z.object({
  name: z.enum(TRACKABLE_EVENTS),
  productId: z.string().max(40).nullish(),
  path: z.string().max(300).nullish(),
  utmSource: z.string().max(60).nullish(),
  utmCampaign: z.string().max(80).nullish(),
  props: z.record(z.string(), z.union([z.string().max(200), z.number(), z.boolean()])).optional(),
});

export const POST = route(async (req) => {
  if (!(await rateLimit(`analytics:${await clientIp()}`, 300, 600))) return json({ ok: false }, 429);
  const body = schema.parse(await req.json());
  const user = await getCustomer();
  await track(body.name, { ...body, userId: user?.id ?? null });
  return json({ ok: true });
});
