import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/auth/guards";
import { getSettings } from "@/lib/settings";
import { daysAgo, hoursAgo } from "@/lib/time";
import { Card, PageHeader, Table } from "@/components/admin/ui";
import { MarketingSettingsForm } from "@/components/admin/integration-forms";
export const metadata = { title: "Marketing" };
export default async function Marketing() {
  await requireStaffPage("settings.write");
  const [s, campaigns, subs, abandoned] = await Promise.all([
    getSettings(),
    db.$queryRaw<{ campaign: string; source: string | null; sessions: bigint; purchases: bigint }[]>`
      SELECT a."utmCampaign" AS campaign, MAX(a."utmSource") AS source, COUNT(DISTINCT a."sessionId") AS sessions,
        COUNT(DISTINCT p."sessionId") AS purchases
      FROM "AnalyticsEvent" a
      LEFT JOIN "AnalyticsEvent" p ON p."sessionId" = a."sessionId" AND p.name = 'purchase' AND p."createdAt" >= a."createdAt"
      WHERE a.name = 'page_view' AND a."utmCampaign" IS NOT NULL AND a."createdAt" >= now() - interval '90 days'
      GROUP BY a."utmCampaign" ORDER BY sessions DESC LIMIT 20`,
    db.newsletterSubscriber.count({ where: { unsubscribedAt: null } }),
    db.cart.count({ where: { items: { some: {} }, convertedOrderId: null, updatedAt: { lt: hoursAgo(3), gt: daysAgo(14) } } }),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title="Marketing" description="Tracking pixels, SEO and campaign performance" />
      <MarketingSettingsForm value={s.marketing} seo={s.seo} />
      <div className="grid gap-4 xl:grid-cols-3">
        <Card title="Campaign performance" description="Sessions with UTM tags (last 90 days) and purchases in the same session" className="xl:col-span-2" bodyClassName="p-0">
          {campaigns.length ? (
            <Table className="rounded-none border-0"><thead><tr><th>Campaign</th><th>Source</th><th className="text-right">Sessions</th><th className="text-right">Purchases</th><th className="text-right">Conversion</th></tr></thead>
              <tbody>{campaigns.map((c) => <tr key={c.campaign}><td className="font-medium">{c.campaign}</td><td>{c.source ?? "—"}</td><td className="text-right tabular">{Number(c.sessions)}</td><td className="text-right tabular">{Number(c.purchases)}</td><td className="text-right tabular">{Number(c.sessions) ? ((Number(c.purchases) / Number(c.sessions)) * 100).toFixed(1) : 0}%</td></tr>)}</tbody></Table>
          ) : <p className="p-5 text-sm text-muted-foreground">No UTM-tagged traffic recorded yet. Add <code>?utm_source=…&utm_campaign=…</code> to your ad links.</p>}
        </Card>
        <Card title="Audience">
          <dl className="space-y-3 text-sm"><div className="flex justify-between"><dt className="text-muted-foreground">Newsletter subscribers</dt><dd className="font-semibold tabular">{subs}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Abandoned bags (3h–14d)</dt><dd className="font-semibold tabular">{abandoned}</dd></div></dl>
          <p className="mt-3 text-[12px] text-muted-foreground">Abandoned-bag recovery messages are only sent to shoppers who explicitly consented; contact details are not collected otherwise.</p>
        </Card>
      </div>
    </div>
  );
}
