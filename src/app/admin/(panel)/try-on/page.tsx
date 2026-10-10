import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/auth/guards";
import { getSettings } from "@/lib/settings";
import { secretStatus } from "@/lib/secrets";
import { resolveProvider } from "@/lib/tryon/service";
import { formatDateTime } from "@/lib/utils";
import { daysAgo, monthStart as getMonthStart } from "@/lib/time";
import { Card, PageHeader, StatusBadge, Table } from "@/components/admin/ui";
import { TryOnSettingsForm } from "@/components/admin/integration-forms";
export const metadata = { title: "Virtual Try-On" };
export default async function TryOnAdmin() {
  await requireStaffPage("tryon.manage");
  const since = daysAgo(30);
  const monthStart = getMonthStart();
  const [settings, secret, { provider, reason }, byStatus, errors, cost, recent, products] = await Promise.all([
    getSettings(), secretStatus("tryon.google"), resolveProvider(),
    db.tryOnJob.groupBy({ by: ["status", "isDemo"], where: { createdAt: { gte: since } }, _count: true }),
    db.tryOnJob.groupBy({ by: ["errorCode"], where: { createdAt: { gte: since }, status: "FAILED" }, _count: true }),
    db.aiGenerationRecord.aggregate({ where: { createdAt: { gte: monthStart } }, _sum: { estimatedCostMicro: true }, _avg: { latencyMs: true }, _count: true }),
    db.tryOnJob.findMany({ orderBy: { createdAt: "desc" }, take: 15, include: { product: { select: { name: true } } } }),
    db.product.count({ where: { tryOnEnabled: true, status: "ACTIVE" } }),
  ]);
  const count = (s: string, demo?: boolean) => byStatus.filter((b) => b.status === s && (demo === undefined || b.isDemo === demo)).reduce((a, b) => a + b._count, 0);
  return (
    <div className="space-y-6">
      <PageHeader title="Virtual Try-On" description="AI provider, limits, privacy and usage" />
      <div className={`rounded-xl border p-4 text-sm ${provider.isReal ? "border-emerald-500/30 bg-emerald-500/10" : "border-amber-500/30 bg-amber-500/10"}`}>
        <p className="font-semibold">{provider.isReal ? `Live: Google Vertex AI (${settings.tryon.model})` : "Demo mode — no AI images are generated"}</p>
        <p className="mt-0.5 text-muted-foreground">{provider.isReal ? "Customers receive real AI-generated previews, labelled as AI previews." : `${reason} Customers see a clearly labelled demo result that is not an AI try-on.`}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[["Try-on products", products], ["Jobs (30d)", byStatus.reduce((a, b) => a + b._count, 0)], ["Succeeded (real AI)", count("SUCCEEDED", false)], ["Failed", count("FAILED")], ["Est. cost this month", `$${((cost._sum.estimatedCostMicro ?? 0) / 1e6).toFixed(2)}`]].map(([l, v]) => (
          <div key={l as string} className="rounded-xl border border-border bg-surface p-4"><p className="text-[12px] text-muted-foreground">{l}</p><p className="mt-1 text-xl font-semibold tabular">{v}</p></div>
        ))}
      </div>
      <TryOnSettingsForm value={settings.tryon} secret={secret} />
      <div className="grid gap-4 xl:grid-cols-3">
        <Card title="Failure reasons (30d)">{errors.length ? <ul className="space-y-1 text-sm">{errors.map((e) => <li key={e.errorCode ?? "x"} className="flex justify-between"><span className="font-mono text-[12px]">{e.errorCode ?? "unknown"}</span><span className="tabular">{e._count}</span></li>)}</ul> : <p className="text-sm text-muted-foreground">No failures.</p>}{cost._avg.latencyMs != null && <p className="mt-3 text-[12px] text-muted-foreground">Average provider latency: {(cost._avg.latencyMs / 1000).toFixed(1)}s</p>}</Card>
        <Card title="Recent jobs" description="Customer photos are private and are not viewable here." className="xl:col-span-2" bodyClassName="p-0">
          <Table className="rounded-none border-0"><thead><tr><th>When</th><th>Product</th><th>Status</th><th>Mode</th><th>Retention</th></tr></thead>
            <tbody>{recent.map((j) => <tr key={j.id}><td className="text-muted-foreground">{formatDateTime(j.createdAt)}</td><td>{j.product.name}</td><td><StatusBadge status={j.status} />{j.errorCode && <span className="ml-1 text-[11px] text-muted-foreground">{j.errorCode}</span>}</td><td className="text-[12px]">{j.isDemo ? "demo" : j.provider}{j.usedSampleModel ? " · sample model" : ""}</td><td className="text-[12px] text-muted-foreground">{j.deletedAt ? "deleted" : j.saveToAccount ? "saved by customer" : `until ${formatDateTime(j.retainUntil)}`}</td></tr>)}</tbody></Table>
        </Card>
      </div>
    </div>
  );
}
