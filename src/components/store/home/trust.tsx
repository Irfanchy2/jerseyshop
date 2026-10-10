import { Banknote, Truck, RefreshCw, Wind } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function Trust({ t }: { t: Dictionary }) {
  const items = [
    { icon: Banknote, title: t.trust.cod, body: t.trust.codBody },
    { icon: Truck, title: t.trust.delivery, body: t.trust.deliveryBody },
    { icon: RefreshCw, title: t.trust.returns, body: t.trust.returnsBody },
    { icon: Wind, title: t.trust.quality, body: t.trust.qualityBody },
  ];
  return (
    <section className="border-y border-border bg-surface">
      <div className="container-x grid grid-cols-2 gap-x-6 gap-y-8 py-10 md:py-12 lg:grid-cols-4">
        {items.map((it) => (
          <div key={it.title} className="flex gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-muted"><it.icon className="h-5 w-5" /></span>
            <div>
              <p className="font-heading text-[15px] font-semibold">{it.title}</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{it.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
