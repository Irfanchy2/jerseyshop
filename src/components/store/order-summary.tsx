import { imgSrc, imgSrcSet } from "@/lib/images";
import { Check, Package, Truck, Home, CircleDot, XCircle } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/utils";
import { STATUS_LABEL, STATUS_STEPS } from "@/lib/orders/public";
import type { Prisma } from "@prisma/client";
import type { publicOrderInclude } from "@/lib/orders/public";
import { cn } from "@/lib/utils";

type Order = Prisma.OrderGetPayload<{ include: typeof publicOrderInclude }>;

export function OrderTimeline({ order }: { order: Order }) {
  const cancelled = order.status === "CANCELLED" || order.status === "RETURNED";
  const normalized = order.status === "READY_TO_SHIP" ? "PROCESSING" : order.status;
  const idx = STATUS_STEPS.indexOf(normalized as (typeof STATUS_STEPS)[number]);
  const icons = [CircleDot, Check, Package, Truck, Home];
  return (
    <div>
      {cancelled ? (
        <p className="flex items-center gap-2 rounded-lg bg-danger/10 p-4 text-sm font-medium text-danger"><XCircle className="h-4 w-4" /> This order was {STATUS_LABEL[order.status].toLowerCase()}.</p>
      ) : (
        <ol className="grid grid-cols-5 gap-1">
          {STATUS_STEPS.map((s, i) => {
            const Icon = icons[i];
            const done = i <= idx;
            return (
              <li key={s} className="flex flex-col items-center text-center">
                <span className={cn("grid h-10 w-10 place-items-center rounded-full border-2 transition", done ? "border-accent bg-accent text-accent-foreground" : "border-border text-muted-foreground")}><Icon className="h-4 w-4" /></span>
                <span className={cn("mt-2 text-[11px] font-medium leading-tight sm:text-xs", !done && "text-muted-foreground")}>{STATUS_LABEL[s]}</span>
              </li>
            );
          })}
        </ol>
      )}
      {order.shipments[0] && (
        <div className="mt-6 rounded-lg border border-border p-4 text-sm">
          <p className="font-semibold capitalize">{order.shipments[0].providerCode} courier</p>
          {order.shipments[0].trackingCode && <p className="text-muted-foreground">Tracking code: <span className="font-mono text-foreground">{order.shipments[0].trackingCode}</span></p>}
          {order.shipments[0].consignmentId && <p className="text-muted-foreground">Consignment: <span className="font-mono text-foreground">{order.shipments[0].consignmentId}</span></p>}
          <ul className="mt-3 space-y-1.5">
            {order.shipments[0].events.map((e) => (
              <li key={e.id} className="flex justify-between gap-4 text-[13px]"><span className="capitalize">{e.description ?? e.providerStatus.replace(/_/g, " ")}</span><span className="text-muted-foreground">{formatDateTime(e.occurredAt)}</span></li>
            ))}
          </ul>
        </div>
      )}
      <ul className="mt-6 space-y-2 text-[13px] text-muted-foreground">
        {order.events.map((e) => (
          <li key={e.id} className="flex justify-between gap-4"><span>{STATUS_LABEL[e.status]}{e.note && e.note !== STATUS_LABEL[e.status] ? ` — ${e.note}` : ""}</span><span>{formatDateTime(e.createdAt)}</span></li>
        ))}
      </ul>
    </div>
  );
}

export function OrderItemsSummary({ order }: { order: Order }) {
  return (
    <div>
      <ul className="divide-y divide-border">
        {order.items.map((it) => {
          const c = it.customization as { playerName?: string; playerNumber?: string } | null;
          return (
            <li key={it.id} className="flex gap-4 py-4">
              <div className="h-20 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {it.imageUrl && <img src={imgSrc(it.imageUrl, 320)} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="flex-1 text-sm">
                <p className="font-medium">{it.productName}</p>
                <p className="text-muted-foreground">{it.size} · {it.color} · Qty {it.quantity}</p>
                {c?.playerName && <p className="text-accent">Personalised: {c.playerName} #{c.playerNumber}</p>}
              </div>
              <p className="text-sm font-medium tabular">{formatMoney(it.lineTotalMinor)}</p>
            </li>
          );
        })}
      </ul>
      <dl className="mt-2 space-y-1.5 border-t border-border pt-4 text-sm">
        <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd className="tabular">{formatMoney(order.subtotalMinor + order.customizationMinor)}</dd></div>
        {order.discountMinor > 0 && <div className="flex justify-between text-success"><dt>Discount{order.couponCode ? ` (${order.couponCode})` : ""}</dt><dd className="tabular">−{formatMoney(order.discountMinor)}</dd></div>}
        <div className="flex justify-between"><dt className="text-muted-foreground">Delivery</dt><dd className="tabular">{order.shippingMinor ? formatMoney(order.shippingMinor) : "Free"}</dd></div>
        <div className="flex justify-between pt-2 text-base font-bold"><dt>Total</dt><dd className="tabular">{formatMoney(order.totalMinor)}</dd></div>
        <div className="flex justify-between text-[13px] text-muted-foreground"><dt>Payment</dt><dd>{order.paymentMethod === "COD" ? "Cash on Delivery" : "Online (SSLCommerz)"} · {order.paymentStatus.toLowerCase()}</dd></div>
      </dl>
    </div>
  );
}
