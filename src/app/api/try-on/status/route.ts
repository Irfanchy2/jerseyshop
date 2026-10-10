import { json, route } from "@/lib/api";
import { getSettings } from "@/lib/settings";
import { resolveProvider } from "@/lib/tryon/service";

/** Public: whether try-on is enabled and whether it runs in demo mode (no secrets exposed). */
export const GET = route(async () => {
  const s = (await getSettings()).tryon;
  const { provider } = await resolveProvider();
  return json({ enabled: s.enabled, demo: !provider.isReal, maxUploadMb: s.maxUploadMb, retentionHours: s.retentionHours, sampleModels: s.sampleModels.map((m) => ({ id: m.id, label: m.label })) });
});
