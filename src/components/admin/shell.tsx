"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Popover from "@radix-ui/react-popover";
import {
  LayoutDashboard, Package, PlusSquare, FolderTree, Layers, Shirt, Boxes, ShoppingCart, Truck, Users, TicketPercent, Star,
  LayoutTemplate, Palette, Image as ImageIcon, Sparkles, CreditCard, Settings2, BarChart3, Megaphone, ShieldCheck, Bell, Settings,
  ScrollText, PanelLeftClose, PanelLeftOpen, Search, Moon, Sun, LogOut, ExternalLink, Menu, X, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { adminLogoutAction } from "@/lib/admin/auth-actions";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; perm?: string };
const NAV: { group: string; items: NavItem[] }[] = [
  { group: "Overview", items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard, perm: "dashboard.view" }, { href: "/admin/analytics", label: "Analytics", icon: BarChart3, perm: "dashboard.view" }] },
  {
    group: "Sales",
    items: [
      { href: "/admin/orders", label: "Orders", icon: ShoppingCart, perm: "orders.read" },
      { href: "/admin/shipping", label: "Shipping", icon: Truck, perm: "orders.read" },
      { href: "/admin/customers", label: "Customers", icon: Users, perm: "customers.read" },
      { href: "/admin/discounts", label: "Discounts", icon: TicketPercent, perm: "discounts.write" },
      { href: "/admin/reviews", label: "Reviews", icon: Star, perm: "reviews.write" },
    ],
  },
  {
    group: "Catalog",
    items: [
      { href: "/admin/products", label: "Products", icon: Package, perm: "products.read" },
      { href: "/admin/products/new", label: "Add product", icon: PlusSquare, perm: "products.write" },
      { href: "/admin/categories", label: "Categories", icon: FolderTree, perm: "products.write" },
      { href: "/admin/collections", label: "Collections", icon: Layers, perm: "products.write" },
      { href: "/admin/inventory", label: "Inventory", icon: Boxes, perm: "products.read" },
      { href: "/admin/customizer", label: "Customisation", icon: Shirt, perm: "products.write" },
    ],
  },
  {
    group: "Storefront",
    items: [
      { href: "/admin/content/homepage", label: "Homepage", icon: LayoutTemplate, perm: "content.write" },
      { href: "/admin/appearance", label: "Appearance", icon: Palette, perm: "content.write" },
      { href: "/admin/content/media", label: "Media", icon: ImageIcon, perm: "content.write" },
      { href: "/admin/try-on", label: "Virtual Try-On", icon: Sparkles, perm: "tryon.manage" },
    ],
  },
  {
    group: "Settings",
    items: [
      { href: "/admin/settings/payments", label: "Payments", icon: CreditCard, perm: "settings.write" },
      { href: "/admin/settings/shipping", label: "Delivery & couriers", icon: Settings2, perm: "settings.write" },
      { href: "/admin/marketing", label: "Marketing", icon: Megaphone, perm: "settings.write" },
      { href: "/admin/staff", label: "Staff & roles", icon: ShieldCheck, perm: "staff.manage" },
      { href: "/admin/notifications", label: "Notifications", icon: Bell },
      { href: "/admin/settings", label: "System", icon: Settings, perm: "settings.write" },
      { href: "/admin/audit-logs", label: "Audit logs", icon: ScrollText, perm: "audit.read" },
    ],
  },
];

type Notif = { id: string; title: string; body: string | null; link: string | null; createdAt: string; read: boolean };

export function AdminShell({
  children,
  user,
  permissions,
  brand,
  notifications,
  unread,
}: {
  children: React.ReactNode;
  user: { name: string; email: string; roleName: string };
  permissions: string[];
  brand: string;
  notifications: Notif[];
  unread: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = React.useState(false);
  const [dark, setDark] = React.useState(false);
  const [mobile, setMobile] = React.useState(false);
  const [q, setQ] = React.useState("");

  React.useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("admin:collapsed") === "1");
      const stored = localStorage.getItem("admin:theme");
      setDark(stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches);
    } catch {}
  }, []);
  React.useEffect(() => setMobile(false), [pathname]);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      try { localStorage.setItem("admin:collapsed", c ? "0" : "1"); } catch {}
      return !c;
    });
  };
  const toggleDark = () => {
    setDark((d) => {
      try { localStorage.setItem("admin:theme", d ? "light" : "dark"); } catch {}
      return !d;
    });
  };

  const can = (p?: string) => !p || permissions.includes(p);
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname === href || (pathname.startsWith(href + "/") && href !== "/admin/products/new" && !(href === "/admin/settings" && pathname !== href)));

  const nav = (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4" aria-label="Admin">
      {NAV.map((g) => {
        const items = g.items.filter((i) => can(i.perm));
        if (!items.length) return null;
        return (
          <div key={g.group}>
            {!collapsed && <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{g.group}</p>}
            <ul className="space-y-0.5">
              {items.map((i) => {
                const active = isActive(i.href);
                return (
                  <li key={i.href}>
                    <Link
                      href={i.href}
                      title={collapsed ? i.label : undefined}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group flex h-9 items-center gap-3 rounded-lg px-3 text-[13.5px] font-medium transition-colors",
                        active ? "bg-foreground text-background" : "text-foreground/70 hover:bg-muted hover:text-foreground",
                        collapsed && "justify-center px-0",
                      )}
                    >
                      <i.icon className="h-[17px] w-[17px] shrink-0" />
                      {!collapsed && <span className="truncate">{i.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className={cn("admin-theme min-h-dvh bg-background text-foreground", dark && "dark")} style={{ ["--admin-sidebar" as string]: collapsed ? "68px" : "248px" }}>
      {/* Desktop sidebar */}
      <aside className={cn("fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-border bg-surface transition-[width] duration-300 lg:flex", collapsed ? "w-[68px]" : "w-[248px]")}>
        <div className={cn("flex h-16 items-center border-b border-border px-5", collapsed && "justify-center px-0")}>
          <Link href="/admin" className="flex items-center gap-2 font-heading font-extrabold tracking-[0.14em]">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-foreground text-[11px] text-background">JS</span>
            {!collapsed && <span className="truncate text-[13px]">{brand}</span>}
          </Link>
        </div>
        {nav}
        <div className="border-t border-border p-3">
          <button onClick={toggleCollapsed} className={cn("flex h-9 w-full items-center gap-3 rounded-lg px-3 text-[13px] text-muted-foreground hover:bg-muted hover:text-foreground", collapsed && "justify-center px-0")} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <><PanelLeftClose className="h-4 w-4" /> Collapse</>}
          </button>
        </div>
      </aside>

      {/* Mobile sidebar */}
      {mobile && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobile(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-[280px] flex-col bg-surface shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-border px-5">
              <span className="font-heading text-[13px] font-extrabold tracking-[0.14em]">{brand}</span>
              <button onClick={() => setMobile(false)} aria-label="Close menu"><X className="h-5 w-5" /></button>
            </div>
            {nav}
          </aside>
        </div>
      )}

      <div className={cn("transition-[padding] duration-300", collapsed ? "lg:pl-[68px]" : "lg:pl-[248px]")}>
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur md:px-6">
          <button className="grid h-9 w-9 place-items-center rounded-lg hover:bg-muted lg:hidden" onClick={() => setMobile(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <form
            className="relative max-w-md flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              if (q.trim()) router.push(`/admin/search?q=${encodeURIComponent(q.trim())}`);
            }}
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search orders, products, customers…" className="h-9 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm outline-none focus:border-foreground/40" aria-label="Search admin" />
          </form>
          <div className="ml-auto flex items-center gap-1">
            <Link href="/" target="_blank" className="hidden h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] text-muted-foreground hover:bg-muted hover:text-foreground sm:inline-flex">
              View store <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            <button onClick={toggleDark} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-muted" aria-label="Toggle dark mode">{dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>
            <Popover.Root>
              <Popover.Trigger className="relative grid h-9 w-9 place-items-center rounded-lg hover:bg-muted" aria-label={`Notifications (${unread} unread)`}>
                <Bell className="h-4 w-4" />
                {unread > 0 && <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>}
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content align="end" sideOffset={8} className={cn("admin-theme z-50 w-80 rounded-xl border border-border bg-surface text-foreground shadow-xl", dark && "dark")}>
                  <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    <p className="text-sm font-semibold">Notifications</p>
                    <Link href="/admin/notifications" className="text-xs text-muted-foreground hover:text-foreground">View all</Link>
                  </div>
                  <ul className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 && <li className="p-4 text-sm text-muted-foreground">You&apos;re all caught up.</li>}
                    {notifications.map((n) => (
                      <li key={n.id}>
                        <Link href={n.link ?? "/admin/notifications"} className="flex gap-3 border-b border-border px-4 py-3 last:border-0 hover:bg-muted">
                          <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-brand")} />
                          <span className="min-w-0">
                            <span className="block truncate text-[13px] font-medium">{n.title}</span>
                            {n.body && <span className="block truncate text-[12px] text-muted-foreground">{n.body}</span>}
                            <span className="text-[11px] text-muted-foreground">{new Date(n.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger className="ml-1 flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 hover:bg-muted">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-foreground text-[11px] font-bold text-background">{user.name.split(" ").map((x) => x[0]).join("").slice(0, 2)}</span>
                <span className="hidden text-left md:block"><span className="block text-[13px] font-medium leading-tight">{user.name}</span><span className="block text-[11px] text-muted-foreground">{user.roleName}</span></span>
                <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground md:block" />
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content align="end" sideOffset={8} className={cn("admin-theme z-50 min-w-52 rounded-xl border border-border bg-surface p-1.5 text-foreground shadow-xl", dark && "dark")}>
                  <div className="px-2.5 py-2 text-[12px] text-muted-foreground">{user.email}</div>
                  <DropdownMenu.Separator className="my-1 h-px bg-border" />
                  <DropdownMenu.Item asChild><Link href="/admin/notifications" className="flex rounded-md px-2.5 py-2 text-sm outline-none hover:bg-muted">Notifications</Link></DropdownMenu.Item>
                  <DropdownMenu.Item asChild><Link href="/" target="_blank" className="flex rounded-md px-2.5 py-2 text-sm outline-none hover:bg-muted">Open storefront</Link></DropdownMenu.Item>
                  <DropdownMenu.Separator className="my-1 h-px bg-border" />
                  <form action={adminLogoutAction}>
                    <button className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-red-600 hover:bg-muted"><LogOut className="h-4 w-4" /> Sign out</button>
                  </form>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </header>
        <main className="mx-auto max-w-[1400px] p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
