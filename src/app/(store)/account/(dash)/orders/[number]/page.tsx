import { notFound } from "next/navigation";
import { requireCustomer } from "@/lib/auth/guards";
import { getOrderForViewer } from "@/lib/orders/public";
import { OrderItemsSummary, OrderTimeline } from "@/components/store/order-summary";

export default async function AccountOrderPage({ params }: { params: Promise<{ number: string }> }) {
  await requireCustomer("/account/orders");
  const order = await getOrderForViewer((await params).number);
  if (!order) notFound();
  return (
    <div className="space-y-8 rounded-[var(--radius)] border border-border bg-surface p-6">
      <h2 className="font-mono text-lg font-semibold">{order.number}</h2>
      <OrderTimeline order={order} />
      <OrderItemsSummary order={order} />
      {order.address && <p className="text-sm text-muted-foreground">{order.address.name} · {order.address.phone}<br />{order.address.line1}, {order.address.area}, {order.address.district}, {order.address.division}</p>}
    </div>
  );
}
