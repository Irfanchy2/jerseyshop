import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, actions, back }: { title: string; description?: React.ReactNode; actions?: React.ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {back && <Link href={back.href} className="mb-2 inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground"><ChevronLeft className="h-3.5 w-3.5" />{back.label}</Link>}
        <h1 className="font-heading text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, description, actions, children, className, bodyClassName }: { title?: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <section className={cn("rounded-xl border border-border bg-surface", className)}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            {title && <h2 className="text-[15px] font-semibold">{title}</h2>}
            {description && <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-14 text-center">
      <p className="font-semibold">{title}</p>
      {body && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto rounded-xl border border-border bg-surface", className)}>
      <table className="w-full min-w-[640px] text-left text-[13.5px] [&_tbody_tr:hover]:bg-muted/50 [&_tbody_tr]:border-t [&_tbody_tr]:border-border [&_td]:px-4 [&_td]:py-3 [&_th]:px-4 [&_th]:py-2.5 [&_th]:text-[12px] [&_th]:font-medium [&_th]:text-muted-foreground [&_thead]:bg-muted/40">{children}</table>
    </div>
  );
}

export function Pagination({ page, pages, href }: { page: number; pages: number; href: (p: number) => string }) {
  if (pages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-between text-sm">
      <p className="text-muted-foreground">Page {page} of {pages}</p>
      <div className="flex gap-2">
        {page > 1 ? <Link href={href(page - 1)} className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-3 hover:bg-muted"><ChevronLeft className="h-3.5 w-3.5" /> Prev</Link> : null}
        {page < pages ? <Link href={href(page + 1)} className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-3 hover:bg-muted">Next <ChevronRight className="h-3.5 w-3.5" /></Link> : null}
      </div>
    </div>
  );
}

const STATUS_TONES: Record<string, string> = {
  PENDING: "bg-amber-500/12 text-amber-700 dark:text-amber-300",
  CONFIRMED: "bg-sky-500/12 text-sky-700 dark:text-sky-300",
  PROCESSING: "bg-indigo-500/12 text-indigo-700 dark:text-indigo-300",
  READY_TO_SHIP: "bg-violet-500/12 text-violet-700 dark:text-violet-300",
  SHIPPED: "bg-blue-500/12 text-blue-700 dark:text-blue-300",
  IN_TRANSIT: "bg-blue-500/12 text-blue-700 dark:text-blue-300",
  BOOKED: "bg-sky-500/12 text-sky-700 dark:text-sky-300",
  REQUESTED: "bg-zinc-500/12 text-zinc-600 dark:text-zinc-300",
  DELIVERED: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  PAID: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  ACTIVE: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  APPROVED: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  SUCCEEDED: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  CONNECTED: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  CANCELLED: "bg-red-500/12 text-red-700 dark:text-red-300",
  FAILED: "bg-red-500/12 text-red-700 dark:text-red-300",
  ERROR: "bg-red-500/12 text-red-700 dark:text-red-300",
  REJECTED: "bg-red-500/12 text-red-700 dark:text-red-300",
  RETURNED: "bg-orange-500/12 text-orange-700 dark:text-orange-300",
  HOLD: "bg-orange-500/12 text-orange-700 dark:text-orange-300",
  UNPAID: "bg-zinc-500/12 text-zinc-600 dark:text-zinc-300",
  DRAFT: "bg-zinc-500/12 text-zinc-600 dark:text-zinc-300",
  ARCHIVED: "bg-zinc-500/12 text-zinc-500",
  UNTESTED: "bg-zinc-500/12 text-zinc-600 dark:text-zinc-300",
  MOCK: "bg-amber-500/12 text-amber-700 dark:text-amber-300",
  SANDBOX: "bg-sky-500/12 text-sky-700 dark:text-sky-300",
  LIVE: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize", STATUS_TONES[status] ?? "bg-muted text-muted-foreground")}>{label ?? status.replace(/_/g, " ").toLowerCase()}</span>;
}

export function FilterTabs({ items, active }: { items: { label: string; href: string; key: string; count?: number }[]; active: string }) {
  return (
    <div className="no-scrollbar mb-4 flex gap-1 overflow-x-auto border-b border-border">
      {items.map((i) => (
        <Link key={i.key} href={i.href} className={cn("-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-[13px] font-medium", active === i.key ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
          {i.label}{i.count != null && <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[11px] tabular">{i.count}</span>}
        </Link>
      ))}
    </div>
  );
}

export function DemoBanner() {
  return <p className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-[13px] text-amber-800 dark:text-amber-200">Includes <strong>demo data</strong> seeded for development (orders flagged as demo). Purge it with <code>npm run db:purge-demo</code> before going live.</p>;
}
