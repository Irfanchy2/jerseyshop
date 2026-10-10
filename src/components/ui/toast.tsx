"use client";
import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";

type Toast = { id: number; title: string; description?: string; tone?: "success" | "error" | "info"; action?: { label: string; href: string } };
const listeners = new Set<(t: Toast) => void>();
let counter = 0;

export function toast(t: Omit<Toast, "id">) {
  const full = { ...t, id: ++counter };
  listeners.forEach((l) => l(full));
}

export function Toaster() {
  const [items, setItems] = React.useState<Toast[]>([]);
  React.useEffect(() => {
    const l = (t: Toast) => {
      setItems((prev) => [...prev.slice(-2), t]);
      setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== t.id)), 4200);
    };
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:px-6" aria-live="polite" role="status">
      <AnimatePresence initial={false}>
        {items.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.18 } }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-border bg-surface p-4 text-foreground shadow-[0_12px_40px_-12px_rgba(0,0,0,.25)]"
          >
            {t.tone === "error" ? <AlertCircle className="mt-0.5 h-5 w-5 text-danger" /> : t.tone === "info" ? <Info className="mt-0.5 h-5 w-5" /> : <CheckCircle2 className="mt-0.5 h-5 w-5 text-success" />}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{t.title}</p>
              {t.description && <p className="mt-0.5 text-[13px] text-muted-foreground">{t.description}</p>}
            </div>
            {t.action && (
              <a href={t.action.href} className="text-sm font-semibold underline underline-offset-4">{t.action.label}</a>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
