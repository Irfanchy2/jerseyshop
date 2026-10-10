import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { handleApiError } from "@/lib/api";
import { audit } from "@/lib/audit";
export async function GET() {
  try {
    const staff = await requirePermission("customers.read");
    const subs = await db.newsletterSubscriber.findMany({ where: { unsubscribedAt: null } });
    await audit({ actorId: staff.id, action: "newsletter.export", entityType: "newsletter", summary: `${subs.length} rows` });
    const csv = ["email,locale,source,consent_at", ...subs.map((s) => [s.email, s.locale, s.source ?? "", s.consentAt.toISOString()].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
    return new Response(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": 'attachment; filename="newsletter.csv"' } });
  } catch (e) {
    return handleApiError(e);
  }
}
