import { headers } from "next/headers";
import { findOrderByNumberAndPhone, getOrderForViewer } from "@/lib/orders/public";
import { rateLimit } from "@/lib/rate-limit";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { OrderItemsSummary, OrderTimeline } from "@/components/store/order-summary";

export const metadata = { title: "Track your order" };

export default async function TrackOrderPage({ searchParams }: { searchParams: Promise<{ order?: string; phone?: string }> }) {
  const { order: number, phone } = await searchParams;
  let order = null;
  let error: string | null = null;
  if (number && phone) {
    const ip = (await headers()).get("x-forwarded-for")?.split(",")[0] ?? "local";
    if (!(await rateLimit(`order-lookup:${ip}`, 20, 600))) error = "Too many attempts. Please try again in a few minutes.";
    else {
      order = await findOrderByNumberAndPhone(number, phone);
      if (!order) error = "We couldn't find an order with that number and phone. Check both and try again.";
    }
  } else if (number) {
    order = await getOrderForViewer(number);
  }
  return (
    <div className="container-x max-w-3xl py-12 md:py-16">
      <h1 className="font-heading text-[32px] font-extrabold md:text-[44px]">Track your order</h1>
      <p className="mt-2 text-muted-foreground">Enter your order number and the mobile number you used at checkout.</p>
      <form className="mt-8 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end" method="get">
        <Field label="Order number" htmlFor="order"><Input id="order" name="order" defaultValue={number} placeholder="JS-100500" required /></Field>
        <Field label="Mobile number" htmlFor="phone"><Input id="phone" name="phone" type="tel" defaultValue={phone} placeholder="01XXXXXXXXX" required /></Field>
        <Button type="submit" className="h-11">Track</Button>
      </form>
      {error && <p className="mt-6 rounded-lg bg-danger/10 p-4 text-sm text-danger" role="alert">{error}</p>}
      {order && (
        <div className="mt-10 space-y-8 rounded-[var(--radius)] border border-border bg-surface p-6 md:p-8">
          <p className="font-mono text-sm">{order.number}</p>
          <OrderTimeline order={order} />
          <OrderItemsSummary order={order} />
        </div>
      )}
    </div>
  );
}
