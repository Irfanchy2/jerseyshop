import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { getOrderForViewer } from "@/lib/orders/public";
import { getDictionary } from "@/lib/i18n/server";
import { Button } from "@/components/ui/button";
import { OrderItemsSummary, OrderTimeline } from "@/components/store/order-summary";

export const metadata = { title: "Order confirmed", robots: { index: false } };

export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ order?: string; paid?: string }> }) {
  const { order: number, paid } = await searchParams;
  const t = await getDictionary();
  const order = number ? await getOrderForViewer(number) : null;
  return (
    <div className="container-x max-w-3xl py-14 md:py-20">
      <div className="text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-success" strokeWidth={1.5} />
        <h1 className="mt-5 font-heading text-[30px] font-extrabold md:text-[40px]">{t.checkout.successTitle}</h1>
        <p className="mt-3 text-muted-foreground">{t.checkout.successBody}</p>
        {number && <p className="mt-6 inline-block rounded-full bg-muted px-5 py-2 text-sm">{t.checkout.orderNumber}: <span className="font-mono font-semibold">{number}</span></p>}
        {paid && <p className="mt-3 text-sm font-medium text-success">Payment received and verified.</p>}
      </div>
      {order ? (
        <div className="mt-12 space-y-10 rounded-[var(--radius)] border border-border bg-surface p-6 md:p-8">
          <OrderTimeline order={order} />
          <OrderItemsSummary order={order} />
          {order.address && (
            <div className="text-sm">
              <p className="font-semibold">Delivering to</p>
              <p className="mt-1 text-muted-foreground">{order.address.name} · {order.address.phone}<br />{order.address.line1}, {order.address.area}, {order.address.district}</p>
            </div>
          )}
        </div>
      ) : (
        <p className="mt-10 text-center text-sm text-muted-foreground">Use your order number and phone to <Link href="/track-order" className="underline">track this order</Link>.</p>
      )}
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Button asChild><Link href="/shop">{t.cart.continue}</Link></Button>
        <Button asChild variant="outline"><Link href={`/track-order${number ? `?order=${number}` : ""}`}>{t.checkout.trackOrder}</Link></Button>
      </div>
    </div>
  );
}
