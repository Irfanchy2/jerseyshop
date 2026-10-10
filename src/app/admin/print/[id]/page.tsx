import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/auth/guards";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { PrintButton } from "@/components/admin/print-button";

export default async function PrintSlip({ params }: { params: Promise<{ id: string }> }) {
  await requireStaffPage("orders.read");
  const [{ id }, s] = await Promise.all([params, getSettings()]);
  const o = await db.order.findUnique({ where: { id }, include: { items: true, address: true, shipments: { where: { status: { notIn: ["FAILED"] } }, take: 1, orderBy: { createdAt: "desc" } } } });
  if (!o) notFound();
  const sh = o.shipments[0];
  return (
    <div className="mx-auto max-w-2xl bg-white p-8 text-black print:p-0">
      <div className="mb-6 flex items-start justify-between">
        <div><p className="text-lg font-extrabold tracking-[0.18em]">{s.brand.name}</p><p className="text-xs">{s.brand.address} · {s.brand.supportPhone}</p></div>
        <div className="text-right"><p className="font-mono text-xl font-bold">{o.number}</p><p className="text-xs">{formatDate(o.placedAt)}</p></div>
      </div>
      <div className="grid grid-cols-2 gap-6 border-y border-black py-4 text-sm">
        <div><p className="text-xs font-bold uppercase">Deliver to</p><p className="mt-1">{o.address?.name}<br />{o.address?.phone}{o.address?.altPhone ? ` / ${o.address.altPhone}` : ""}<br />{o.address?.line1}<br />{o.address?.area}, {o.address?.district}</p></div>
        <div><p className="text-xs font-bold uppercase">Payment</p><p className="mt-1">{o.paymentMethod === "COD" ? `CASH ON DELIVERY: ${formatMoney(o.paymentStatus === "PAID" ? 0 : sh?.codAmountMinor ?? o.totalMinor)}` : `PREPAID (${o.paymentStatus})`}</p>{sh && <p className="mt-2 text-xs">Courier: {sh.providerCode} {sh.mode === "MOCK" ? "(MOCK)" : ""}<br />Tracking: <span className="font-mono">{sh.trackingCode}</span></p>}</div>
      </div>
      <table className="mt-4 w-full text-sm">
        <thead><tr className="border-b border-black text-left text-xs uppercase"><th className="py-1">Item</th><th>SKU</th><th>Size</th><th className="text-right">Qty</th></tr></thead>
        <tbody>
          {o.items.map((i) => {
            const c = i.customization as { playerName?: string; playerNumber?: string; font?: string } | null;
            return (
              <tr key={i.id} className="border-b border-gray-300 align-top">
                <td className="py-2">{i.productName}{c?.playerName !== undefined && <div className="mt-1 text-xs font-bold">PRINT: {c.playerName} #{c.playerNumber} ({c.font})</div>}</td>
                <td className="font-mono text-xs">{i.sku}</td><td>{i.size}</td><td className="text-right">{i.quantity}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {o.notes && <p className="mt-4 text-sm"><strong>Customer note:</strong> {o.notes}</p>}
      <p className="mt-6 text-right text-sm font-bold">Order total: {formatMoney(o.totalMinor)}</p>
      <PrintButton />
    </div>
  );
}
