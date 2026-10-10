"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Heart, Menu, Search, ShoppingBag, User, ChevronRight, Sparkles, Shirt } from "lucide-react";
import { useStore } from "./store-provider";
import { Logo } from "./logo";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { SearchOverlay } from "./search-overlay";
import { cn } from "@/lib/utils";

export type NavData = {
  categories: { slug: string; name: string; nameBn: string | null }[];
  clubs: { slug: string; name: string; nameBn: string | null; primaryHex: string }[];
  nationals: { slug: string; name: string; nameBn: string | null; primaryHex: string }[];
  collections: { slug: string; name: string; nameBn: string | null; accentHex: string | null }[];
};

type Announcement = { en: string; bn: string; href?: string }[];

function AnnouncementBar({ messages }: { messages: Announcement }) {
  const { locale } = useStore();
  const [i, setI] = React.useState(0);
  React.useEffect(() => {
    if (messages.length < 2) return;
    const id = setInterval(() => setI((x) => (x + 1) % messages.length), 4500);
    return () => clearInterval(id);
  }, [messages.length]);
  if (!messages.length) return null;
  const m = messages[i];
  const text = locale === "bn" ? m.bn || m.en : m.en;
  return (
    <div className="bg-foreground text-background">
      <div className="container-x flex h-9 items-center justify-center overflow-hidden text-[12px] font-medium tracking-wide">
        <AnimatePresence mode="wait">
          <motion.div key={i} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }} transition={{ duration: 0.35 }}>
            {m.href ? <Link href={m.href} className="underline-offset-4 hover:underline">{text}</Link> : text}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function LocaleSwitch({ className }: { className?: string }) {
  const { locale } = useStore();
  const router = useRouter();
  const set = async (l: "en" | "bn") => {
    if (l === locale) return;
    await fetch("/api/locale", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale: l }) });
    router.refresh();
  };
  return (
    <div className={cn("inline-flex items-center rounded-full border border-border p-0.5 text-[11px] font-semibold", className)} role="group" aria-label="Language">
      {(["en", "bn"] as const).map((l) => (
        <button key={l} onClick={() => set(l)} aria-pressed={locale === l} className={cn("rounded-full px-2 py-1 transition", locale === l ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}>
          {l === "en" ? "EN" : "বাং"}
        </button>
      ))}
    </div>
  );
}

export function Header({ brand, announcement, nav }: { brand: { name: string; logoUrl: string | null }; announcement: Announcement; nav: NavData }) {
  const { t, locale, cart, setCartOpen, wishlist } = useStore();
  const pathname = usePathname();
  const [scrolled, setScrolled] = React.useState(false);
  const [hidden, setHidden] = React.useState(false);
  const [mega, setMega] = React.useState<null | "shop" | "clubs" | "national">(null);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const L = (en: string, bn: string | null) => (locale === "bn" && bn ? bn : en);

  React.useEffect(() => {
    let last = window.scrollY;
    const handler = () => {
      const y = window.scrollY;
      setScrolled(y > 8);
      // Hide on scroll down, reveal on scroll up.
      if (y > 240 && y > last + 4) setHidden(true);
      else if (y < last - 4) setHidden(false);
      last = y;
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const [lastPath, setLastPath] = React.useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMega(null);
    setMobileOpen(false);
    setSearchOpen(false);
  }

  const openMega = (k: typeof mega) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setMega(k);
  };
  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => setMega(null), 140);
  };

  const navItems: { key: string; label: string; href: string; mega?: "shop" | "clubs" | "national" }[] = [
    { key: "shop", label: t.nav.shop, href: "/shop", mega: "shop" },
    { key: "clubs", label: t.nav.clubs, href: "/shop?category=club-jerseys", mega: "clubs" },
    { key: "national", label: t.nav.national, href: "/shop?category=national-team-jerseys", mega: "national" },
    { key: "custom", label: t.nav.custom, href: "/collections/personalised" },
    { key: "training", label: t.nav.training, href: "/shop?category=training-kits" },
    { key: "tryon", label: t.nav.tryOn, href: "/try-on" },
  ];

  const count = cart?.itemCount ?? 0;

  return (
    <>
      <AnnouncementBar messages={announcement} />
      <header
        className={cn(
          "sticky top-0 z-40 transition-[transform,background-color,box-shadow,border-color] duration-500 ease-[var(--ease-out-expo)]",
          hidden && !mega ? "-translate-y-full" : "translate-y-0",
          scrolled || mega ? "border-b border-border bg-background/90 backdrop-blur-xl" : "border-b border-transparent bg-background",
        )}
        onMouseLeave={scheduleClose}
      >
        <div className="container-x grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-4 lg:h-[72px]">
          <div className="flex items-center gap-1 lg:hidden">
            <button className="-ml-2 grid h-10 w-10 place-items-center rounded-full hover:bg-foreground/5" aria-label={t.nav.menu} onClick={() => setMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>
            <button className="grid h-10 w-10 place-items-center rounded-full hover:bg-foreground/5" aria-label={t.nav.search} onClick={() => setSearchOpen(true)}>
              <Search className="h-5 w-5" />
            </button>
          </div>
          <div className="hidden lg:block">
            <Logo name={brand.name} logoUrl={brand.logoUrl} />
          </div>
          <div className="lg:hidden">
            <Logo name={brand.name} logoUrl={brand.logoUrl} className="text-[15px]" />
          </div>

          <nav className="hidden lg:flex items-center gap-1" aria-label="Main">
            {navItems.map((item) => (
              <div key={item.key} onMouseEnter={() => (item.mega ? openMega(item.mega) : setMega(null))}>
                <Link
                  href={item.href}
                  className={cn(
                    "relative inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-[14px] font-medium text-foreground/80 transition-colors hover:text-foreground",
                    (mega === item.mega && item.mega) && "text-foreground",
                  )}
                  aria-expanded={item.mega ? mega === item.mega : undefined}
                  onFocus={() => item.mega && openMega(item.mega)}
                >
                  {item.key === "tryon" && <Sparkles className="h-3.5 w-3.5 text-accent" />}
                  {item.label}
                  <span className={cn("absolute inset-x-3.5 bottom-1.5 h-px origin-left scale-x-0 bg-foreground transition-transform duration-300", mega === item.mega && item.mega && "scale-x-100")} />
                </Link>
              </div>
            ))}
          </nav>

          <div className="flex items-center justify-end gap-0.5">
            <LocaleSwitch className="mr-2 hidden md:inline-flex" />
            <button className="hidden h-10 w-10 place-items-center rounded-full hover:bg-foreground/5 lg:grid" aria-label={t.nav.search} onClick={() => setSearchOpen(true)}>
              <Search className="h-[19px] w-[19px]" />
            </button>
            <Link href="/account" className="hidden h-10 w-10 place-items-center rounded-full hover:bg-foreground/5 sm:grid" aria-label={t.nav.account}>
              <User className="h-[19px] w-[19px]" />
            </Link>
            <Link href="/account/wishlist" className="relative hidden h-10 w-10 place-items-center rounded-full hover:bg-foreground/5 sm:grid" aria-label={t.nav.wishlist}>
              <Heart className="h-[19px] w-[19px]" />
              {wishlist.size > 0 && <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-accent" />}
            </Link>
            <button className="relative grid h-10 w-10 place-items-center rounded-full hover:bg-foreground/5" aria-label={`${t.nav.cart} (${count})`} onClick={() => setCartOpen(true)}>
              <ShoppingBag className="h-[19px] w-[19px]" />
              <AnimatePresence>
                {count > 0 && (
                  <motion.span
                    key={count}
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.4, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 22 }}
                    className="absolute right-0.5 top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground tabular"
                  >
                    {count}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>

        {/* Mega menu */}
        <AnimatePresence>
          {mega && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6, transition: { duration: 0.15 } }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-x-0 top-full hidden border-b border-border bg-background lg:block"
              onMouseEnter={() => openMega(mega)}
              onMouseLeave={scheduleClose}
            >
              <div className="container-x grid grid-cols-12 gap-10 py-10">
                {mega === "shop" && (
                  <>
                    <MegaColumn title={t.shop.category} className="col-span-3">
                      {nav.categories.map((c) => <MegaLink key={c.slug} href={`/shop?category=${c.slug}`}>{L(c.name, c.nameBn)}</MegaLink>)}
                      <MegaLink href="/shop" strong>{t.home.viewAll}</MegaLink>
                    </MegaColumn>
                    <MegaColumn title={t.nav.collections} className="col-span-3">
                      {nav.collections.map((c) => <MegaLink key={c.slug} href={`/collections/${c.slug}`}>{L(c.name, c.nameBn)}</MegaLink>)}
                    </MegaColumn>
                    <div className="col-span-6 grid grid-cols-2 gap-4">
                      <MegaPromo href="/collections/personalised" title={t.nav.custom} body={t.product.customize} icon={<Shirt className="h-5 w-5" />} tone="bg-[#efe7e2]" />
                      <MegaPromo href="/try-on" title={t.nav.tryOn} body={t.tryon.subtitle} icon={<Sparkles className="h-5 w-5" />} tone="bg-[#e5ebf2]" />
                    </div>
                  </>
                )}
                {(mega === "clubs" || mega === "national") && (
                  <div className="col-span-12">
                    <p className="mb-5 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{mega === "clubs" ? t.home.clubs : t.home.nationalTeams}</p>
                    <div className="grid grid-cols-4 gap-3 xl:grid-cols-6">
                      {(mega === "clubs" ? nav.clubs : nav.nationals).map((tm) => (
                        <Link key={tm.slug} href={`/shop?team=${tm.slug}`} className="group flex items-center gap-3 rounded-xl border border-border bg-surface p-3 transition hover:border-foreground/30">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white" style={{ background: tm.primaryHex }} aria-hidden>
                            {tm.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                          </span>
                          <span className="text-sm font-medium leading-tight">{L(tm.name, tm.nameBn)}</span>
                          <ChevronRight className="ml-auto h-4 w-4 -translate-x-1 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" />
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Mobile navigation */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" title={t.nav.menu} className="max-w-[88vw]">
          <div className="flex h-16 items-center border-b border-border px-5">
            <Logo name={brand.name} logoUrl={brand.logoUrl} className="text-[15px]" />
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <nav className="flex flex-col" aria-label="Mobile">
              {navItems.map((item, i) => (
                <motion.div key={item.key} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 + i * 0.04 }}>
                  <Link href={item.href} className="flex items-center justify-between border-b border-border py-4 font-heading text-xl font-semibold">
                    {item.label}
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </Link>
                </motion.div>
              ))}
            </nav>
            <p className="mb-3 mt-8 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{t.nav.collections}</p>
            <div className="flex flex-wrap gap-2">
              {nav.collections.map((c) => (
                <Link key={c.slug} href={`/collections/${c.slug}`} className="rounded-full border border-border px-3.5 py-2 text-sm">{L(c.name, c.nameBn)}</Link>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-border p-5">
            <div className="flex gap-4 text-sm font-medium">
              <Link href="/account">{t.nav.account}</Link>
              <Link href="/account/wishlist">{t.nav.wishlist}</Link>
              <Link href="/track-order">{t.nav.trackOrder}</Link>
            </div>
            <LocaleSwitch />
          </div>
        </SheetContent>
      </Sheet>

      <SearchOverlay open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}

function MegaColumn({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
      <ul className="space-y-2.5">{children}</ul>
    </div>
  );
}
function MegaLink({ href, children, strong }: { href: string; children: React.ReactNode; strong?: boolean }) {
  return (
    <li>
      <Link href={href} className={cn("text-[15px] text-foreground/80 transition hover:text-foreground", strong && "font-semibold text-foreground underline underline-offset-4")}>
        {children}
      </Link>
    </li>
  );
}
function MegaPromo({ href, title, body, icon, tone }: { href: string; title: string; body: string; icon: React.ReactNode; tone: string }) {
  return (
    <Link href={href} className={cn("group flex flex-col justify-between rounded-[var(--radius)] p-6 transition hover:brightness-[0.98]", tone)}>
      <span className="grid h-10 w-10 place-items-center rounded-full bg-white/70 text-black">{icon}</span>
      <div className="mt-10 text-black">
        <p className="font-heading text-xl font-bold">{title}</p>
        <p className="mt-1 text-sm text-black/60">{body}</p>
        <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold">
          Explore <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

