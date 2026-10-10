import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/auth/guards";
import { decryptJson, last4 } from "@/lib/crypto";
import { getSettings } from "@/lib/settings";
import { formatDateTime } from "@/lib/utils";
import { Card, PageHeader, StatusBadge, Table } from "@/components/admin/ui";
import { CourierCard, DeliverySettingsForm, RatesEditor } from "@/components/admin/courier-forms";

export const metadata = { title: "Delivery & couriers" };

export default async function ShippingSettings() {
  await requireStaffPage("settings.write");
  const [providers, rates, settings, logs] = await Promise.all([
    db.shippingProvider.findMany({ orderBy: { code: "desc" } }),
    db.shippingRate.findMany({ orderBy: { sortOrder: "asc" } }),
    getSettings(),
    db.courierLog.findMany({ where: { success: false }, orderBy: { createdAt: "desc" }, take: 15 }),
  ]);
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return (
    <div className="space-y-6">
      <PageHeader title="Delivery & couriers" description="Shipping integrations, delivery charges and fulfilment automation" />
      <div className="grid gap-6 xl:grid-cols-2">
        {providers.map((p) => {
          const secrets = p.encryptedConfig ? decryptJson<Record<string, string>>(p.encryptedConfig) : {};
          return (
            <CourierCard
              key={p.code}
              webhookUrl={`${base}/api/webhooks/${p.code}`}
              p={{
                code: p.code as "steadfast" | "pathao", name: p.name, isEnabled: p.isEnabled, isDefault: p.isDefault, mode: p.mode, status: p.status,
                lastCheckedAt: p.lastCheckedAt?.toISOString() ?? null, lastError: p.lastError,
                publicConfig: p.publicConfig as Record<string, string | number | null>,
                configured: Object.fromEntries(Object.entries(secrets).map(([k, v]) => [k, v ? (k === "username" ? v.replace(/(.{2}).*(@.*)/, "$1•••$2") : last4(v)) : null])),
              }}
            />
          );
        })}
      </div>
      <Card title="Delivery charges" description="Charged at checkout based on the customer's district">
        <RatesEditor rates={rates.map((r) => ({ id: r.id, code: r.code, name: r.name, nameBn: r.nameBn, fee: r.feeMinor / 100, etaText: r.etaText, districts: r.districts, isActive: r.isActive, sortOrder: r.sortOrder }))} />
      </Card>
      <Card title="Fulfilment rules"><DeliverySettingsForm value={settings.delivery} /></Card>
      <Card title="Courier error history" description="Most recent failed courier API calls" bodyClassName="p-0">
        {logs.length === 0 ? <p className="p-5 text-sm text-muted-foreground">No errors recorded.</p> : (
          <Table className="rounded-none border-0">
            <thead><tr><th>When</th><th>Courier</th><th>Operation</th><th>Mode</th><th>HTTP</th><th>Error</th></tr></thead>
            <tbody>{logs.map((l) => <tr key={l.id}><td className="whitespace-nowrap text-muted-foreground">{formatDateTime(l.createdAt)}</td><td className="capitalize">{l.providerCode}</td><td>{l.operation}</td><td><StatusBadge status={l.mode} /></td><td>{l.httpStatus ?? "—"}</td><td className="max-w-md truncate text-[12px]" title={l.error ?? ""}>{l.error}</td></tr>)}</tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
