import Link from "next/link";
import { Suspense } from "react";
import { catalogFacets, searchCatalog, type CatalogFilters } from "@/lib/catalog/queries";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { fmt } from "@/lib/i18n/format";
import { ProductGrid } from "../product-card";
import { ActiveFilters, FilterPanel, FilterPending, MobileFilters, SortSelect } from "./filters";
import { cn } from "@/lib/utils";

export async function CatalogView({
  filters,
  basePath,
  title,
  description,
  eyebrow,
  hideCategory,
  searchParams,
}: {
  filters: CatalogFilters;
  basePath: string;
  title: string;
  description?: string | null;
  eyebrow?: string;
  hideCategory?: boolean;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const [facets, result, t, locale] = await Promise.all([catalogFacets(), searchCatalog(filters, await getLocale()), getDictionary(), getLocale()]);
  void locale;
  const pageHref = (page: number) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) if (typeof v === "string" && k !== "page") p.set(k, v);
    if (page > 1) p.set("page", String(page));
    return `${basePath}${p.toString() ? `?${p}` : ""}`;
  };
  return (
    <div className="container-x pb-10 pt-8 md:pt-12">
      <header className="mb-8 md:mb-10">
        {eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{eyebrow}</p>}
        <h1 className="font-heading text-[34px] font-extrabold leading-none md:text-[52px]">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-muted-foreground">{description}</p>}
      </header>
      <Suspense>
        <div className="sticky top-16 z-20 -mx-4 mb-6 flex items-center justify-between gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none lg:top-[72px]">
          <p className="whitespace-nowrap text-[13px] text-muted-foreground tabular sm:text-sm" aria-live="polite">{fmt(t.shop.results, { n: result.total })}</p>
          <div className="flex items-center gap-2">
            <MobileFilters facets={facets} total={result.total} hideCategory={hideCategory} />
            <SortSelect />
          </div>
        </div>
        <div className="grid gap-10 lg:grid-cols-[260px_1fr]">
          <aside className="hidden lg:block" aria-label={t.shop.filters}>
            <div className="sticky top-28 max-h-[calc(100dvh-8rem)] overflow-y-auto pr-3 [scrollbar-width:thin]">
              <FilterPanel facets={facets} hideCategory={hideCategory} />
            </div>
          </aside>
          <div>
            <ActiveFilters facets={facets} />
            <FilterPending>
              {result.items.length ? (
                <ProductGrid items={result.items} priorityCount={4} className="lg:grid-cols-3 xl:grid-cols-4" />
              ) : (
                <div className="rounded-[var(--radius)] border border-dashed border-border px-6 py-20 text-center">
                  <p className="font-heading text-xl font-semibold">{t.shop.noResults}</p>
                  <Link href={basePath} className="mt-4 inline-block text-sm font-semibold underline underline-offset-4">{t.shop.clear}</Link>
                </div>
              )}
            </FilterPending>
            {result.pages > 1 && (
              <nav className="mt-14 flex items-center justify-center gap-1.5" aria-label="Pagination">
                {Array.from({ length: result.pages }, (_, i) => i + 1).map((n) => (
                  <Link key={n} href={pageHref(n)} aria-current={n === result.page ? "page" : undefined} className={cn("grid h-10 min-w-10 place-items-center rounded-full px-3 text-sm font-medium tabular", n === result.page ? "bg-foreground text-background" : "hover:bg-foreground/5")}>
                    {n}
                  </Link>
                ))}
              </nav>
            )}
          </div>
        </div>
      </Suspense>
    </div>
  );
}
