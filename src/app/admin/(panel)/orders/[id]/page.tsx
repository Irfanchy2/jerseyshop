import Link from "next/link";
import { notFound } from "next/navigation";
import { Printer, MapPin, Phone, Mail, User } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/auth/guards";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/utils";
import { ALLOWED_TRANSITIONS } from "@/lib/orders/transitions";
import { Card, PageHeader, StatusBadge } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { OrderStatusForm, AdminNotesForm, CreateShipmentDialog } from "@/components/admin/order-forms";
import { STATUS_LABEL } from "@/lib/orders/public";

export const metadata = { title: "Order" };

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaffPage("orders.read");
  const { id } = await params;
  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: true, address: true, payments: true, couponRedemptions: true, user: { select: { id: true, name: true, email: true } },
      events: { orderBy: { createdAt: "desc" } },
      shipments: { orderBy: { createdAt: "desc" }, include: { events: { orderBy: { occurredAt: "desc" } } } },
    },
  });
  if (!order) notFound();
  const [providers, priorOrders] = await Promise.all([
    db.shippingProvider.findMany({ orderBy: { code: "asc" } }),
    db.order.count({ where: { phone: order.phone, id: { not: order.id } } }),
  ]);
  const actors = await db.user.findMany({ where: { id: { in: order.events.map((e) => e.actorId).filter(Boolean) as string[] } }, select: { id: true, name: true } });
  const canShip = staff.permissions.has("shipping.write") && ["CONFIRMED", "PROCESSING", "READY_TO_SHIP"].includes(order.status) && !order.shipments.some((s) => !["FAILED", "CANCELLED", "RETURNED"].includes(s.status));

  return (
    <div>
      <PageHeader
        back={{ href: "/admin/orders", label: "Orders" }}
        title={`Order ${order.number}`}
        description={<span className="flex flex-wrap items-center gap-2">Placed {formatDateTime(order.placedAt)} <StatusBadge status={order.status} /> <StatusBadge status={order.paymentStatus} label={`${order.paymentMethod === "COD" ? "COD" : "Online"} · ${order.paymentStatus.toLowerCase()}`} />{order.isDemo && <StatusBadge status="MOCK" label="demo order" />}</span>}
        actions={
          <>
            <Button asChild variant="outline" size="sm"><Link href={`/admin/print/${order.id}`} target="_blank"><Printer className="h-4 w-4" /> Packing slip</Link></Button>
            {canShip && <CreateShipmentDialog orderId={order.id} total={order.totalMinor} paid={order.paymentStatus === "PAID"} providers={providers.map((p) => ({ code: p.code, name: p.name, enabled: p.isEnabled, mode: p.mode, isDefault: p.isDefault }))} address={order.address ? { district: order.address.district, area: order.address.area, cityId: order.address.pathaoCityId, zoneId: order.address.pathaoZoneId, areaId: order.address.pathaoAreaId } : null} />}
          </>
        }
      />
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card title="Items" bodyClassName="p-0">
            <ul className="divide-y divide-border">
              {order.items.map((it) => {
                const c = it.customization as { playerName?: string; playerNumber?: string; font?: string; textColor?: string; baseColor?: string } | null;
                return (
                  <li key={it.id} className="flex gap-4 p-4">
                    <div className="h-20 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {it.imageUrl && <img src={it.imageUrl} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1 text-sm">
                      {it.productId ? <Link href={`/admin/products/${it.productId}`} className="font-medium hover:underline">{it.productName}</Link> : <span className="font-medium">{it.productName}</span>}
                      <p className="text-muted-foreground">{it.sku} · {it.size} · {it.color}</p>
                      {c?.playerName !== undefined && (
                        <div className="mt-2 inline-flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/50 px-2.5 py-1.5 text-[12px]">
                          <span className="font-semibold">Print:</span> <span className="font-mono">{c.playerName || "—"}</span> <span className="font-mono">#{c.playerNumber || "—"}</span>
                          <span className="text-muted-foreground">font {c.font}</span>
                          <span className="inline-flex items-center gap-1 text-muted-foreground">text <span className="h-3 w-3 rounded-full border" style={{ background: c.textColor }} /></span>
                          {c.baseColor && <span className="inline-flex items-center gap-1 text-muted-foreground">shirt <span className="h-3 w-3 rounded-full border" style={{ background: c.baseColor }} /></span>}
                        </div>
                      )}
                    </div>
                    <div className="text-right text-sm tabular">
                      <p>{formatMoney(it.unitPriceMinor)} × {it.quantity}</p>
                      {it.customizationMinor > 0 && <p className="text-muted-foreground">+{formatMoney(it.customizationMinor)} print</p>}
                      <p className="font-semibold">{formatMoney(it.lineTotalMinor)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
            <dl className="space-y-1.5 border-t border-border p-4 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd className="tabular">{formatMoney(order.subtotalMinor)}</dd></div>
              {order.customizationMinor > 0 && <div className="flex justify-between"><dt className="text-muted-foreground">Personalisation</dt><dd className="tabular">{formatMoney(order.customizationMinor)}</dd></div>}
              {order.discountMinor > 0 && <div className="flex justify-between"><dt className="text-muted-foreground">Discount {order.couponCode && `(${order.couponCode})`}</dt><dd className="tabular">−{formatMoney(order.discountMinor)}</dd></div>}
              <div className="flex justify-between"><dt className="text-muted-foreground">Delivery ({order.shippingRateCode?.replace(/_/g, " ")})</dt><dd className="tabular">{formatMoney(order.shippingMinor)}</dd></div>
              <div className="flex justify-between pt-1 text-base font-semibold"><dt>Total</dt><dd className="tabular">{formatMoney(order.totalMinor)}</dd></div>
            </dl>
          </Card>

          <Card title="Shipments" description="Courier bookings for this order">
            {order.shipments.length === 0 ? (
              <p className="text-sm text-muted-foreground">{canShip ? "No shipment yet. Use “Create shipment” to book a courier." : order.status === "PENDING" ? "Confirm the order before booking a courier." : "No shipments."}</p>
            ) : (
              <ul className="space-y-4">
                {order.shipments.map((s) => (
                  <li key={s.id} className="rounded-lg border border-border p-4 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold capitalize">{s.providerCode}</span>
                      <StatusBadge status={s.status} />
                      <StatusBadge status={s.mode} label={s.mode === "MOCK" ? "mock — not a real booking" : s.mode.toLowerCase()} />
                      <span className="ml-auto text-[12px] text-muted-foreground">{formatDateTime(s.createdAt)}</span>
                    </div>
                    <div className="mt-2 grid gap-1 text-[13px] sm:grid-cols-2">
                      <p><span className="text-muted-foreground">Consignment:</span> <span className="font-mono">{s.consignmentId ?? "—"}</span></p>
                      <p><span className="text-muted-foreground">Tracking:</span> <span className="font-mono">{s.trackingCode ?? "—"}</span></p>
                      <p><span className="text-muted-foreground">COD amount:</span> {formatMoney(s.codAmountMinor)}</p>
                      <p><span className="text-muted-foreground">Courier status:</span> {s.providerStatus ?? "—"}</p>
                    </div>
                    {s.lastError && <p className="mt-2 rounded bg-red-500/10 px-2.5 py-1.5 text-[12px] text-red-700 dark:text-red-300">{s.lastError}</p>}
                    {s.events.length > 0 && (
                      <ul className="mt-3 space-y-1 border-t border-border pt-3 text-[12px] text-muted-foreground">
                        {s.events.map((e) => <li key={e.id} className="flex justify-between gap-3"><span>{e.description ?? e.providerStatus} <span className="opacity-60">({e.source})</span></span><span>{formatDateTime(e.occurredAt)}</span></li>)}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Timeline">
            <ol className="relative space-y-4 border-l border-border pl-5">
              {order.events.map((e) => (
                <li key={e.id} className="text-sm">
                  <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-foreground" />
                  <p className="font-medium">{STATUS_LABEL[e.status]}{e.note && e.note !== STATUS_LABEL[e.status] ? <span className="font-normal text-muted-foreground"> — {e.note}</span> : null}</p>
                  <p className="text-[12px] text-muted-foreground">{formatDateTime(e.createdAt)}{e.actorId ? ` · ${actors.find((a) => a.id === e.actorId)?.name ?? "staff"}` : " · system"}</p>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-4">
          {staff.permissions.has("orders.write") && (
            <Card title="Update status">
              <OrderStatusForm key={order.status} orderId={order.id} current={order.status} next={ALLOWED_TRANSITIONS[order.status]} />
            </Card>
          )}
          <Card title="Customer">
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /> {order.customerName} {order.user ? <Link href={`/admin/customers/${order.user.id}`} className="text-[12px] underline">account</Link> : <span className="text-[12px] text-muted-foreground">guest</span>}</p>
              <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> <a href={`tel:${order.phone}`} className="hover:underline">{order.phone}</a></p>
              {order.email && <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /> {order.email}</p>}
              <p className="text-[12px] text-muted-foreground">{priorOrders} other order{priorOrders === 1 ? "" : "s"} from this phone</p>
            </div>
          </Card>
          {order.address && (
            <Card title="Delivery address">
              <p className="flex gap-2 text-sm"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /><span>{order.address.name}<br />{order.address.line1}<br />{order.address.area}, {order.address.district}<br />{order.address.division}{order.address.postcode ? ` ${order.address.postcode}` : ""}{order.address.altPhone && <><br />Alt: {order.address.altPhone}</>}</span></p>
              {order.address.pathaoCityId && <p className="mt-2 text-[12px] text-muted-foreground">Pathao: city {order.address.pathaoCityId} · zone {order.address.pathaoZoneId}{order.address.pathaoAreaId ? ` · area ${order.address.pathaoAreaId}` : ""}</p>}
            </Card>
          )}
          {order.notes && <Card title="Customer note"><p className="text-sm">{order.notes}</p></Card>}
          {order.payments.length > 0 && (
            <Card title="Payments">
              <ul className="space-y-2 text-sm">{order.payments.map((p) => <li key={p.id} className="flex justify-between"><span className="font-mono text-[12px]">{p.tranId}</span><StatusBadge status={p.status} /></li>)}</ul>
            </Card>
          )}
          <Card title="Internal notes"><AdminNotesForm orderId={order.id} notes={order.adminNotes ?? ""} /></Card>
        </div>
      </div>
    </div>
  );
}
