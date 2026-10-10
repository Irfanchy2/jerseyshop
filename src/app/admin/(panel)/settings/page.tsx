import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/auth/guards";
import { storage } from "@/lib/storage";
import { formatDateTime } from "@/lib/utils";
import { Card, PageHeader, StatusBadge, Table } from "@/components/admin/ui";
export const metadata = { title: "System" };
export default async function System() {
  await requireStaffPage("settings.write");
  const [jobs, dead, lastJob, dbOk, demo, version] = await Promise.all([
    db.job.groupBy({ by: ["type", "status"], _count: true }),
    db.job.findMany({ where: { status: "DEAD" }, orderBy: { updatedAt: "desc" }, take: 10 }),
    db.job.findFirst({ where: { status: "SUCCEEDED" }, orderBy: { updatedAt: "desc" } }),
    db.$queryRaw<{ ok: number }[]>`SELECT 1 AS ok`.then(() => true).catch(() => false),
    db.order.count({ where: { isDemo: true } }),
    db.$queryRaw<{ v: string }[]>`SELECT version() AS v`,
  ]);
  const env = [
    ["APP_URL", !!process.env.APP_URL], ["APP_SECRET", (process.env.APP_SECRET?.length ?? 0) >= 32], ["ENCRYPTION_KEY", !!process.env.ENCRYPTION_KEY], ["CRON_SECRET", !!process.env.CRON_SECRET],
    ["SMTP_URL (password reset emails)", !!process.env.SMTP_URL], ["S3_BUCKET (object storage)", !!process.env.S3_BUCKET],
  ] as const;
  return (
    <div className="space-y-4">
      <PageHeader title="System" description="Health, configuration and background jobs. Brand, homepage and appearance are under Storefront." />
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Health">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt>Database</dt><dd><StatusBadge status={dbOk ? "CONNECTED" : "ERROR"} label={dbOk ? "connected" : "error"} /></dd></div>
            <div className="flex justify-between"><dt>PostgreSQL</dt><dd className="text-[12px] text-muted-foreground">{version[0]?.v.split(" ").slice(0, 2).join(" ")}</dd></div>
            <div className="flex justify-between"><dt>Storage</dt><dd className="text-[12px]">{storage().kind === "s3" ? "S3-compatible" : "Local disk (single server only)"}</dd></div>
            <div className="flex justify-between"><dt>Background worker last success</dt><dd className="text-[12px] text-muted-foreground">{lastJob ? formatDateTime(lastJob.updatedAt) : "never — schedule /api/cron/jobs"}</dd></div>
            <div className="flex justify-between"><dt>Demo data</dt><dd className="text-[12px]">{demo ? `${demo} demo orders present` : "none"}</dd></div>
          </dl>
        </Card>
        <Card title="Environment">
          <ul className="space-y-2 text-sm">{env.map(([k, ok]) => <li key={k} className="flex justify-between"><span className="font-mono text-[12px]">{k}</span><StatusBadge status={ok ? "CONNECTED" : "PENDING"} label={ok ? "set" : "not set"} /></li>)}</ul>
          <p className="mt-3 text-[12px] text-muted-foreground">Secrets are configured via environment variables or the encrypted integration settings — values are never displayed.</p>
        </Card>
      </div>
      <Card title="Background jobs" bodyClassName="p-0">
        <Table className="rounded-none border-0"><thead><tr><th>Type</th><th>Status</th><th className="text-right">Count</th></tr></thead><tbody>{jobs.map((j) => <tr key={j.type + j.status}><td className="font-mono text-[12px]">{j.type}</td><td><StatusBadge status={j.status === "DEAD" ? "FAILED" : j.status} label={j.status.toLowerCase()} /></td><td className="text-right tabular">{j._count}</td></tr>)}</tbody></Table>
      </Card>
      {dead.length > 0 && <Card title="Failed jobs (gave up)" bodyClassName="p-0"><Table className="rounded-none border-0"><thead><tr><th>When</th><th>Type</th><th>Error</th></tr></thead><tbody>{dead.map((j) => <tr key={j.id}><td className="text-muted-foreground">{formatDateTime(j.updatedAt)}</td><td className="font-mono text-[12px]">{j.type}</td><td className="text-[12px]">{j.lastError}</td></tr>)}</tbody></Table></Card>}
      <Card title="Backups & recovery">
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Enable automated daily PostgreSQL backups with point-in-time recovery at your database host (or schedule <code>pg_dump</code>).</li>
          <li>Back up the object storage bucket (product media). Try-on photos are intentionally short-lived and excluded.</li>
          <li>Keep <code>ENCRYPTION_KEY</code> in a secrets manager — without it, stored integration credentials cannot be decrypted.</li>
          <li>See README → “Backups & recovery” for a restore drill.</li>
        </ul>
      </Card>
    </div>
  );
}
