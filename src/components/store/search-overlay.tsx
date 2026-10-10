"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Search, X, ArrowRight } from "lucide-react";
import { useStore } from "./store-provider";
import type { ProductCard } from "@/lib/catalog/queries";
import { Spinner } from "@/components/ui/button";

const SUGGESTIONS = ["Home jersey", "Retro", "Bangladesh", "Training", "Custom"];

export function SearchOverlay({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { t, money } = useStore();
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [items, setItems] = React.useState<ProductCard[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (q.trim().length < 2) return;
    const ctrl = new AbortController();
    const id = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal }).then((r) => r.json());
        setItems(r.items ?? []);
        setTotal(r.total ?? 0);
      } catch {
        /* aborted */
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => {
      clearTimeout(id);
      ctrl.abort();
    };
  }, [q]);

  const short = q.trim().length < 2;
  const shownItems = short ? [] : items;
  const shownTotal = short ? 0 : total;
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    onOpenChange(false);
    router.push(`/shop?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm data-[state=open]:animate-[fade-in_.25s_ease]" />
        <Dialog.Content className="fixed inset-x-0 top-0 z-50 max-h-[90dvh] overflow-y-auto border-b border-border bg-background shadow-2xl outline-none data-[state=open]:animate-[fade-up_.4s_var(--ease-out-expo)]">
          <Dialog.Title className="sr-only">{t.nav.search}</Dialog.Title>
          <Dialog.Description className="sr-only">Search jerseys by team, season or name</Dialog.Description>
          <div className="container-x py-6">
            <form onSubmit={submit} className="flex items-center gap-3 border-b-2 border-foreground pb-3">
              <Search className="h-6 w-6 shrink-0" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search jerseys, clubs, seasons…"
                className="h-12 w-full bg-transparent font-heading text-2xl font-semibold outline-none placeholder:text-muted-foreground/60 md:text-3xl"
                aria-label={t.nav.search}
              />
              {loading && <Spinner className="h-5 w-5" />}
              <Dialog.Close className="grid h-10 w-10 shrink-0 place-items-center rounded-full hover:bg-foreground/5" aria-label={t.nav.close}>
                <X className="h-5 w-5" />
              </Dialog.Close>
            </form>
            {q.trim().length < 2 ? (
              <div className="py-6">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Popular</p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => setQ(s)} className="rounded-full border border-border bg-surface px-4 py-2 text-sm transition hover:border-foreground">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-6">
                {shownItems.length === 0 && !loading ? (
                  <p className="text-muted-foreground">{t.shop.noResults}</p>
                ) : (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                    {shownItems.map((p) => (
                      <Link key={p.id} href={`/products/${p.slug}`} onClick={() => onOpenChange(false)} className="group">
                        <div className="img-zoom aspect-[4/5] overflow-hidden rounded-[var(--radius)] bg-muted">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {p.image && <img src={p.image} alt="" className="h-full w-full object-cover" />}
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm font-medium">{p.name}</p>
                        <p className="text-sm text-muted-foreground tabular">{money(p.price)}</p>
                      </Link>
                    ))}
                  </div>
                )}
                {shownTotal > shownItems.length && (
                  <button onClick={submit} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-4">
                    See all {shownTotal} results <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
