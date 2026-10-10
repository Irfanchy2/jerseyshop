import Link from "next/link";
import { db } from "@/lib/db";
import { requireCustomer } from "@/lib/auth/guards";
import { deleteDesignAction } from "@/lib/account/actions";
import { jerseySvg, type JerseyDesign } from "@/lib/jersey-art";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Saved designs", robots: { index: false } };

export default async function DesignsPage() {
  const user = await requireCustomer("/account/designs");
  const designs = await db.customDesign.findMany({ where: { userId: user.id, savedToAccount: true }, include: { product: true }, orderBy: { createdAt: "desc" } });
  return (
    <div>
      <h2 className="mb-6 font-heading text-xl font-bold">Saved designs</h2>
      {designs.length === 0 ? <p className="text-muted-foreground">No saved designs yet. <Link href="/collections/personalised" className="underline">Personalise a jersey</Link></p> : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {designs.map((d) => {
            const base = d.product.design as unknown as JerseyDesign | null;
            const svg = base ? jerseySvg({ ...base, base: d.baseColor || base.base }, "back", { backdrop: "#efece6", name: d.playerName, number: d.playerNumber, textColor: d.textColor }) : null;
            return (
              <li key={d.id} className="overflow-hidden rounded-[var(--radius)] border border-border bg-surface">
                {svg && <div className="aspect-[4/5] [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />}
                <div className="p-4">
                  <p className="font-medium">{d.product.name}</p>
                  <p className="text-sm text-muted-foreground">{d.playerName} #{d.playerNumber} · {d.font} · +{formatMoney(d.surchargeMinor)}</p>
                  <div className="mt-3 flex gap-2">
                    <Button asChild size="sm"><Link href={`/customize/${d.productId}?design=${d.id}`}>Open</Link></Button>
                    <form action={deleteDesignAction.bind(null, d.id)}><Button size="sm" variant="ghost" type="submit">Remove</Button></form>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
