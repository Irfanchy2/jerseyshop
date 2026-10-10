"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, Check, X } from "lucide-react";
import { useStore } from "../store-provider";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type Facets = {
  categories: { slug: string; name: string; nameBn: string | null }[];
  teams: { slug: string; name: string; kind: "CLUB" | "NATIONAL" }[];
  seasons: string[];
  sizes: string[];
  colors: { name: string; hex: string }[];
  priceRange: { min: number; max: number };
};

const KITS = ["HOME", "AWAY", "THIRD", "GOALKEEPER", "TRAINING", "RETRO", "FAN", "CUSTOM"];

function useFilterNav() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = React.useTransition();
  const set = React.useCallback(
    (mutate: (p: URLSearchParams) => void) => {
      const p = new URLSearchParams(sp.toString());
      mutate(p);
      p.delete("page");
      start(() => router.push(`${pathname}${p.toString() ? `?${p}` : ""}`, { scroll: false }));
    },
    [router, pathname, sp],
  );
  const list = (k: string) => (sp.get(k) ?? "").split(",").filter(Boolean);
  const toggle = (k: string, v: string) =>
    set((p) => {
      const cur = new Set((p.get(k) ?? "").split(",").filter(Boolean));
      if (cur.has(v)) cur.delete(v);
      else cur.add(v);
      if (cur.size) p.set(k, [...cur].join(","));
      else p.delete(k);
    });
  return { sp, set, list, toggle, pending };
}

function Group({ title, children, count }: { title: string; children: React.ReactNode; count?: number }) {
  const [open, setOpen] = React.useState(true);
  return (
    <div className="border-b border-border py-5">
      <button className="flex w-full items-center justify-between text-left text-[14px] font-semibold" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>{title}{count ? <span className="ml-1.5 text-muted-foreground">({count})</span> : null}</span>
        <span className={cn("text-lg leading-none transition-transform", open && "rotate-45")}>+</span>
      </button>
      {open && <div className="mt-4">{children}</div>}
    </div>
  );
}

function CheckRow({ label, checked, onChange, swatch }: { label: string; checked: boolean; onChange: () => void; swatch?: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 py-1.5 text-[14px]">
      <input type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
      <span className={cn("grid h-[18px] w-[18px] place-items-center rounded-[5px] border transition peer-focus-visible:ring-2 peer-focus-visible:ring-foreground/30", checked ? "border-foreground bg-foreground text-background" : "border-foreground/30")}>
        {checked && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
      {swatch && <span className="h-4 w-4 rounded-full border border-black/10" style={{ background: swatch }} />}
      <span className={cn("text-foreground/80", checked && "text-foreground font-medium")}>{label}</span>
    </label>
  );
}

export function FilterPanel({ facets, hideCategory }: { facets: Facets; hideCategory?: boolean }) {
  const { t, locale } = useStore();
  const { sp, set, list, toggle } = useFilterNav();
  const category = sp.get("category");
  const clubs = facets.teams.filter((x) => x.kind === "CLUB");
  const nations = facets.teams.filter((x) => x.kind === "NATIONAL");

  return (
    <div>
      {!hideCategory && (
        <Group title={t.shop.category}>
          <div className="flex flex-col">
            {facets.categories.map((c) => (
              <CheckRow key={c.slug} label={locale === "bn" && c.nameBn ? c.nameBn : c.name} checked={category === c.slug} onChange={() => set((p) => (category === c.slug ? p.delete("category") : p.set("category", c.slug)))} />
            ))}
          </div>
        </Group>
      )}
      <Group title={t.shop.size} count={list("size").length}>
        <div className="flex flex-wrap gap-2">
          {facets.sizes.map((s) => {
            const on = list("size").includes(s);
            return (
              <button key={s} onClick={() => toggle("size", s)} aria-pressed={on} className={cn("h-10 min-w-12 rounded-full border px-3 text-[13px] font-medium transition", on ? "border-foreground bg-foreground text-background" : "border-border bg-surface hover:border-foreground")}>
                {s}
              </button>
            );
          })}
        </div>
      </Group>
      {clubs.length > 0 && (
        <Group title={t.home.clubs} count={list("team").filter((x) => clubs.some((c) => c.slug === x)).length}>
          {clubs.map((tm) => <CheckRow key={tm.slug} label={tm.name} checked={list("team").includes(tm.slug)} onChange={() => toggle("team", tm.slug)} />)}
        </Group>
      )}
      {nations.length > 0 && (
        <Group title={t.home.nationalTeams} count={list("team").filter((x) => nations.some((c) => c.slug === x)).length}>
          {nations.map((tm) => <CheckRow key={tm.slug} label={tm.name} checked={list("team").includes(tm.slug)} onChange={() => toggle("team", tm.slug)} />)}
        </Group>
      )}
      <Group title={t.shop.kitType} count={list("kit").length}>
        <div className="flex flex-wrap gap-2">
          {KITS.map((k) => {
            const on = list("kit").includes(k);
            return (
              <button key={k} onClick={() => toggle("kit", k)} aria-pressed={on} className={cn("h-9 rounded-full border px-3 text-[12px] font-medium capitalize transition", on ? "border-foreground bg-foreground text-background" : "border-border bg-surface hover:border-foreground")}>
                {k.toLowerCase()}
              </button>
            );
          })}
        </div>
      </Group>
      <Group title={t.shop.season} count={list("season").length}>
        {facets.seasons.map((s) => <CheckRow key={s} label={s} checked={list("season").includes(s)} onChange={() => toggle("season", s)} />)}
      </Group>
      <Group title={t.shop.color} count={list("color").length}>
        <div className="max-h-56 overflow-y-auto pr-2">
          {facets.colors.map((c) => <CheckRow key={c.name} label={c.name} swatch={c.hex} checked={list("color").includes(c.name)} onChange={() => toggle("color", c.name)} />)}
        </div>
      </Group>
      <Group title={t.shop.price}>
        <PriceRange key={`${sp.get("min") ?? ""}-${sp.get("max") ?? ""}`} initialMin={sp.get("min") ?? ""} initialMax={sp.get("max") ?? ""} range={facets.priceRange} onApply={(mn, mx) => set((p) => { if (mn) p.set("min", mn); else p.delete("min"); if (mx) p.set("max", mx); else p.delete("max"); })} />
      </Group>
      <Group title={t.shop.availability}>
        <CheckRow label={t.shop.inStockOnly} checked={sp.get("stock") === "1"} onChange={() => set((p) => (p.get("stock") === "1" ? p.delete("stock") : p.set("stock", "1")))} />
      </Group>
    </div>
  );
}

function PriceRange({ initialMin, initialMax, range, onApply }: { initialMin: string; initialMax: string; range: { min: number; max: number }; onApply: (min: string, max: string) => void }) {
  const [min, setMin] = React.useState(initialMin);
  const [max, setMax] = React.useState(initialMax);
  return (
    <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); onApply(min, max); }}>
      <label className="flex-1 text-[12px] text-muted-foreground">
        Min ৳
        <input inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))} placeholder={String(Math.floor(range.min / 100))} className="mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground" />
      </label>
      <label className="flex-1 text-[12px] text-muted-foreground">
        Max ৳
        <input inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))} placeholder={String(Math.ceil(range.max / 100))} className="mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground" />
      </label>
      <Button type="submit" size="sm" variant="outline" className="h-10">Go</Button>
    </form>
  );
}

export function ActiveFilters({ facets }: { facets: Facets }) {
  const { t } = useStore();
  const { sp, set, toggle } = useFilterNav();
  const chips: { label: string; remove: () => void }[] = [];
  const cat = sp.get("category");
  if (cat) chips.push({ label: facets.categories.find((c) => c.slug === cat)?.name ?? cat, remove: () => set((p) => p.delete("category")) });
  for (const k of ["size", "team", "season", "color", "kit"]) {
    for (const v of (sp.get(k) ?? "").split(",").filter(Boolean)) {
      const label = k === "team" ? facets.teams.find((x) => x.slug === v)?.name ?? v : k === "kit" ? v.toLowerCase() : v;
      chips.push({ label, remove: () => toggle(k, v) });
    }
  }
  if (sp.get("min") || sp.get("max")) chips.push({ label: `৳${sp.get("min") ?? 0}–${sp.get("max") ?? "∞"}`, remove: () => set((p) => { p.delete("min"); p.delete("max"); }) });
  if (sp.get("stock") === "1") chips.push({ label: t.shop.inStockOnly, remove: () => set((p) => p.delete("stock")) });
  if (sp.get("q")) chips.push({ label: `“${sp.get("q")}”`, remove: () => set((p) => p.delete("q")) });
  if (!chips.length) return null;
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      {chips.map((c, i) => (
        <button key={i} onClick={c.remove} className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-[13px] font-medium capitalize hover:bg-foreground/10">
          {c.label} <X className="h-3.5 w-3.5" />
        </button>
      ))}
      <button onClick={() => set((p) => { for (const k of [...p.keys()]) if (k !== "sort") p.delete(k); })} className="ml-1 text-[13px] font-semibold underline underline-offset-4">
        {t.shop.clear}
      </button>
    </div>
  );
}

export function SortSelect() {
  const { t } = useStore();
  const { sp, set } = useFilterNav();
  const options = [
    ["featured", t.shop.sortFeatured], ["newest", t.shop.sortNewest], ["best", t.shop.sortBest],
    ["price-asc", t.shop.sortPriceAsc], ["price-desc", t.shop.sortPriceDesc],
  ];
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="hidden text-muted-foreground sm:inline">{t.shop.sort}:</span>
      <select
        value={sp.get("sort") ?? "featured"}
        onChange={(e) => set((p) => (e.target.value === "featured" ? p.delete("sort") : p.set("sort", e.target.value)))}
        className="h-10 max-w-[40vw] cursor-pointer rounded-full border border-border bg-surface px-3 pr-7 text-sm font-medium sm:max-w-none sm:px-4"
        aria-label={t.shop.sort}
      >
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

export function MobileFilters({ facets, total, hideCategory }: { facets: Facets; total: number; hideCategory?: boolean }) {
  const { t } = useStore();
  const [open, setOpen] = React.useState(false);
  const { sp } = useFilterNav();
  const activeCount = ["size", "team", "season", "color", "kit"].reduce((n, k) => n + (sp.get(k) ?? "").split(",").filter(Boolean).length, 0) + (sp.get("category") ? 1 : 0);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="lg:hidden">
        <SlidersHorizontal className="h-4 w-4" /> {t.shop.filters}{activeCount ? ` (${activeCount})` : ""}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" title={t.shop.filters} className="h-[88dvh]">
          <div className="flex h-14 shrink-0 items-center border-b border-border px-5 font-heading text-lg font-bold">{t.shop.filters}</div>
          <div className="flex-1 overflow-y-auto px-5"><FilterPanel facets={facets} hideCategory={hideCategory} /></div>
          <div className="border-t border-border p-4">
            <Button block size="lg" onClick={() => setOpen(false)}>{t.shop.apply} ({total})</Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

export function FilterPending({ children }: { children: React.ReactNode }) {
  const { pending } = useFilterNav();
  return <div className={cn("transition-opacity duration-300", pending && "pointer-events-none opacity-50")} aria-busy={pending}>{children}</div>;
}
