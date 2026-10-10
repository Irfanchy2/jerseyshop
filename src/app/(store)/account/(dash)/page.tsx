import Link from "next/link";
import { db } from "@/lib/db";
import { requireCustomer } from "@/lib/auth/guards";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { STATUS_LABEL } from "@/lib/orders/public";
import { ProfileForm } from "@/components/store/account/account-forms";

export const metadata = { title: "My account", robots: { index: false } };

export default async function AccountHome() {
  const user = await requireCustomer();
  const [orders, profile, counts] = await Promise.all([
    db.order.findMany({ where: { userId: user.id }, orderBy: { placedAt: "desc" }, take: 3 }),
    db.customerProfile.findUnique({ where: { userId: user.id } }),
    db.$transaction([db.order.count({ where: { userId: user.id } }), db.wishlistItem.count({ where: { userId: user.id } }), db.customDesign.count({ where: { userId: user.id, savedToAccount: true } })]),
  ]);
  return (
    <div className="space-y-10">
      <div className="grid grid-cols-3 gap-3">
        {[["Orders", counts[0], "/account/orders"], ["Wishlist", counts[1], "/account/wishlist"], ["Designs", counts[2], "/account/designs"]].map(([l, n, h]) => (
          <Link key={l as string} href={h as string} className="rounded-[var(--radius)] border border-border bg-surface p-5 transition hover:border-foreground/30">
            <p className="font-heading text-3xl font-extrabold tabular">{n as number}</p>
            <p className="text-sm text-muted-foreground">{l as string}</p>
          </Link>
        ))}
      </div>
      <section>
        <h2 className="mb-4 font-heading text-xl font-bold">Recent orders</h2>
        {orders.length === 0 ? <p className="text-muted-foreground">You haven&apos;t placed any orders yet. <Link href="/shop" className="underline">Start shopping</Link></p> : (
          <ul className="divide-y divide-border rounded-[var(--radius)] border border-border bg-surface">
            {orders.map((o) => (
              <li key={o.id}><Link href={`/account/orders/${o.number}`} className="flex items-center justify-between gap-4 p-4 hover:bg-muted/50">
                <span><span className="font-mono text-sm font-semibold">{o.number}</span><span className="block text-[13px] text-muted-foreground">{formatDate(o.placedAt)}</span></span>
                <span className="text-right"><span className="block text-sm font-semibold tabular">{formatMoney(o.totalMinor)}</span><span className="text-[13px] text-muted-foreground">{STATUS_LABEL[o.status]}</span></span>
              </Link></li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="mb-4 font-heading text-xl font-bold">Profile</h2>
        <ProfileForm user={{ name: user.name, email: user.email, phone: user.phone ?? "", marketing: profile?.marketingConsent ?? false }} />
      </section>
    </div>
  );
}
