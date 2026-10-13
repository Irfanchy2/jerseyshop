"use client";

import { Banknote, Truck, RefreshCw, BadgeCheck } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useStore } from "../store-provider";
import { EASE } from "../motion";

/** Benefit strip; directly after the hero it tucks up over the hero card's lower edge. */
export function Trust() {
  const { t } = useStore();
  const reduce = useReducedMotion();
  const items = [
    { icon: Truck, title: t.trust.delivery, body: t.trust.deliveryShort },
    { icon: RefreshCw, title: t.trust.returns, body: t.trust.returnsShort },
    { icon: Banknote, title: t.trust.cod, body: t.trust.codShort },
    { icon: BadgeCheck, title: t.trust.quality, body: t.trust.qualityShort },
  ];
  return (
    <section className="relative z-10 px-3 md:px-4 [.hero-section+&]:-mt-14" data-trust>
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.9, ease: EASE }}
        className="grid grid-cols-2 rounded-[1.5rem] bg-surface lg:w-[89%] lg:grid-cols-4 lg:rounded-[1.75rem]"
      >
        {items.map((it, i) => (
          <div key={it.title} className={`flex items-center gap-3 px-4 py-5 sm:gap-4 sm:px-7 lg:py-7 ${i > 0 ? "lg:border-l lg:border-border" : ""} ${i % 2 === 1 ? "border-l border-border lg:border-l" : ""} ${i > 1 ? "border-t border-border lg:border-t-0" : ""}`}>
            <it.icon className="h-6 w-6 shrink-0 text-accent" strokeWidth={1.6} />
            <div className="min-w-0">
              <p className="text-[14px] font-semibold leading-tight sm:text-[15.5px]">{it.title}</p>
              <p className="mt-1 text-[12.5px] leading-snug text-muted-foreground sm:text-[14px]">{it.body}</p>
            </div>
          </div>
        ))}
      </motion.div>
    </section>
  );
}
