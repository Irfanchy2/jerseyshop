"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, ChevronRight, Menu, Moon, Search, ShoppingBag, Sun, User, X } from "lucide-react";
import { useStore } from "./store-provider";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { SearchOverlay } from "./search-overlay";
import { FlagBD, FlagGB } from "./flags";
import { useIsApple, useTheme } from "@/lib/client/theme";
import { cn } from "@/lib/utils";

export type NavData = {
  categories: { slug: string; name: string; nameBn: string | null }[];
  clubs: { slug: string; name: string; nameBn: string | null; primaryHex: string }[];
  nationals: { slug: string; name: string; nameBn: string | null; primaryHex: string }[];
  collections: { slug: string; name: string; nameBn: string | null; accentHex: string | null }[];
};

type Announcement = { en: string; bn: string; href?: string }[];

const EASE = [0.16, 1, 0.3, 1] as const;

function Wordmark({ name, logoUrl, className }: { name: string; logoUrl: string | null; className?: string }) {
  return (
    <Link href="/" aria-label={`${name} home`} className={cn("inline-flex items-center whitespace-nowrap font-heading font-bold uppercase leading-none", className)}>
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt={name} className="h-8 w-auto" />
      ) : (
        <span className="tracking-[0.32em] [margin-right:-0.32em]">{name}</span>
      )}
    </Link>
  );
}

function useSetLocale() {
  const { locale } = useStore();
  const router = useRouter();
  return async (l: "en" | "bn") => {
    if (l === locale) return;
    await fetch("/api/locale", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale: l }) });
    router.refresh();
  };
}

function LanguagePill() {
  const { locale, t } = useStore();
  const setLocale = useSetLocale();
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger className="inline-flex h-10 items-center gap-2 rounded-full bg-muted px-3.5 text-[14px] font-medium outline-none transition hover:bg-border/70 data-[state=open]:bg-border/70" aria-label={t.common.language}>
        {locale === "bn" ? <FlagBD /> : <FlagGB />}
        <span>{locale === "bn" ? "বাং" : "EN"}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={8} className="z-50 min-w-40 rounded-2xl border border-border bg-surface p-1.5 shadow-[0_18px_40px_-20px_rgba(16,24,40,.35)] data-[state=open]:animate-[fade-in_.18s_ease]">
          {([["en", t.nav.languageEn, FlagGB], ["bn", t.nav.languageBn, FlagBD]] as const).map(([l, label, Flag]) => (
            <DropdownMenu.Item key={l} onSelect={() => setLocale(l)} className={cn("flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-[14px] outline-none data-[highlighted]:bg-muted", locale === l && "font-semibold")}>
              <Flag /> {label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function ThemeButton({ className }: { className?: string }) {
  const { dark, toggle } = useTheme();
  const { t } = useStore();
  return (
    <button onClick={toggle} aria-label={t.nav.theme} aria-pressed={dark} className={cn("relative grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-muted transition hover:bg-border/70", className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={dark ? "sun" : "moon"}
          initial={{ y: 18, opacity: 0, rotate: -45 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          exit={{ y: -18, opacity: 0, rotate: 45 }}
          transition={{ duration: 0.35, ease: EASE }}
          className="grid place-items-center"
        >
          {dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

function BagButton({ className }: { className?: string }) {
  const { t, cart, setCartOpen } = useStore();
  const count = cart?.itemCount ?? 0;
  return (
    <button className={cn("relative grid h-10 w-10 place-items-center rounded-full bg-muted transition hover:bg-border/70", className)} aria-label={`${t.nav.cart} (${count})`} onClick={() => setCartOpen(true)}>
      <ShoppingBag className="h-[18px] w-[18px]" />
      <AnimatePresence>
        {count > 0 && (
          <motion.span
            key={count}
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.3, opacity: 0 }}
            transition={{ type: "spring", stiffness: 520, damping: 24 }}
            className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground tabular"
          >
            {count}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

export function Header({ brand, announcement, nav }: { brand: { name: string; logoUrl: string | null }; announcement: Announcement; nav: NavData }) {
  const { t, locale } = useStore();
  const pathname = usePathname();
  const apple = useIsApple();
  const [scrolled, setScrolled] = React.useState(false);
  const [shopOpen, setShopOpen] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const L = (en: string, bn: string | null) => (locale === "bn" && bn ? bn : en);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const [lastPath, setLastPath] = React.useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setShopOpen(false);
    setMobileOpen(false);
    setSearchOpen(false);
  }

  const openShop = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setShopOpen(true);
  };
  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => setShopOpen(false), 160);
  };

  const navItems = [
    { key: "home", label: t.nav.home, href: "/" },
    { key: "shop", label: t.nav.shop, href: "/shop", dropdown: true },
    { key: "new", label: t.nav.newArrivals, href: "/shop?sort=newest" },
    { key: "sale", label: t.nav.sale, href: "/shop?sale=1" },
  ];
  // Query-filtered links (new arrivals, sale) share /shop, so only Home and Shop show an active state.
  const isActive = (key: string) => (key === "home" ? pathname === "/" : key === "shop" ? /^\/(shop|products|collections)/.test(pathname) : false);

  const message = announcement[0];

  return (
    <>
      {message && (
        <div className="bg-foreground text-background">
          <div className="container-x flex h-8 items-center justify-center text-[12px] font-medium tracking-wide">
            {message.href ? <Link href={message.href} className="underline-offset-4 hover:underline">{locale === "bn" ? message.bn || message.en : message.en}</Link> : locale === "bn" ? message.bn || message.en : message.en}
          </div>
        </div>
      )}
      <motion.header
        initial={{ y: -96, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.9, ease: EASE }}
        className="sticky top-0 z-40 px-3 md:px-4"
        onMouseLeave={scheduleClose}
      >
        <div
          className={cn(
            "relative rounded-b-[1.6rem] bg-surface transition-shadow duration-500",
            scrolled || shopOpen ? "shadow-[0_12px_40px_-22px_rgba(16,24,40,.28)]" : "shadow-none",
          )}
        >
          <div className="grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-4 px-3 md:h-[70px] md:px-5 xl:px-8">
            {/* Left: desktop nav / mobile menu */}
            <nav className="hidden items-center gap-9 xl:flex" aria-label="Main">
              {navItems.map((item) => (
                <div key={item.key} onMouseEnter={item.dropdown ? openShop : () => setShopOpen(false)}>
                  <Link
                    href={item.href}
                    onFocus={item.dropdown ? openShop : undefined}
                    aria-expanded={item.dropdown ? shopOpen : undefined}
                    className="group relative inline-flex h-10 items-center text-[14.5px] font-medium uppercase tracking-[0.02em] text-foreground/85 transition-colors hover:text-foreground"
                  >
                    {item.label}
                    <span
                      className={cn(
                        "absolute -bottom-0.5 left-0 h-[1.5px] w-full origin-right scale-x-0 bg-accent transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:origin-left group-hover:scale-x-100",
                        (isActive(item.key) || (item.dropdown && shopOpen)) && "origin-left scale-x-100",
                      )}
                    />
                  </Link>
                </div>
              ))}
            </nav>
            <div className="flex items-center gap-1 xl:hidden">
              <button className="-ml-1 grid h-10 w-10 place-items-center rounded-full hover:bg-muted" aria-label={t.nav.menu} onClick={() => setMobileOpen(true)}>
                <Menu className="h-5 w-5" />
              </button>
            </div>

            {/* Centre: wordmark */}
            <Wordmark name={brand.name} logoUrl={brand.logoUrl} className="text-[17px] sm:text-[21px] xl:text-[26px]" />

            {/* Right: utilities */}
            <div className="flex items-center justify-end gap-2 md:gap-2.5">
              <div className="hidden md:block">
                <LanguagePill />
              </div>
              <ThemeButton className="hidden sm:grid" />
              <button
                onClick={() => setSearchOpen(true)}
                className="hidden h-10 items-center gap-2.5 rounded-full bg-muted pl-3.5 pr-2 text-[14.5px] text-foreground/80 transition hover:bg-border/70 lg:inline-flex"
                aria-label={t.nav.search}
                aria-keyshortcuts={apple ? "Meta+K" : "Control+K"}
              >
                <Search className="h-[18px] w-[18px]" />
                <span className="pr-6">{t.nav.search}</span>
                <kbd className="rounded-md border border-border bg-surface px-1.5 py-0.5 font-sans text-[10.5px] font-semibold text-muted-foreground">{apple ? "⌘K" : "Ctrl K"}</kbd>
              </button>
              <button onClick={() => setSearchOpen(true)} className="grid h-10 w-10 place-items-center rounded-full bg-muted lg:hidden" aria-label={t.nav.search}>
                <Search className="h-[18px] w-[18px]" />
              </button>
              <Link href="/account" className="hidden h-10 w-10 place-items-center rounded-full bg-muted transition hover:bg-border/70 sm:grid" aria-label={t.nav.account}>
                <User className="h-[18px] w-[18px]" />
              </Link>
              <BagButton />
            </div>
          </div>

          {/* Shop dropdown */}
          <AnimatePresence>
            {shopOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0, transition: { duration: 0.25, ease: EASE } }}
                transition={{ duration: 0.5, ease: EASE }}
                className="hidden overflow-hidden xl:block"
                onMouseEnter={openShop}
                onMouseLeave={scheduleClose}
              >
                <div className="grid grid-cols-12 gap-10 border-t border-border px-8 pb-9 pt-8">
                  <DropColumn title={t.shop.category} className="col-span-3" delay={0}>
                    {nav.categories.map((c) => <DropLink key={c.slug} href={`/shop?category=${c.slug}`}>{L(c.name, c.nameBn)}</DropLink>)}
                  </DropColumn>
                  <DropColumn title={t.home.clubs} className="col-span-3" delay={0.05}>
                    {nav.clubs.slice(0, 8).map((c) => <DropLink key={c.slug} href={`/shop?team=${c.slug}`} dot={c.primaryHex}>{L(c.name, c.nameBn)}</DropLink>)}
                  </DropColumn>
                  <DropColumn title={t.home.nationalTeams} className="col-span-3" delay={0.1}>
                    {nav.nationals.slice(0, 8).map((c) => <DropLink key={c.slug} href={`/shop?team=${c.slug}`} dot={c.primaryHex}>{L(c.name, c.nameBn)}</DropLink>)}
                  </DropColumn>
                  <DropColumn title={t.nav.collections} className="col-span-3" delay={0.15}>
                    {nav.collections.map((c) => <DropLink key={c.slug} href={`/collections/${c.slug}`}>{L(c.name, c.nameBn)}</DropLink>)}
                    <li className="pt-2">
                      <Link href="/shop" className="group inline-flex items-center gap-1.5 text-[14px] font-semibold text-accent-ink">
                        {t.home.viewAll} <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </li>
                  </DropColumn>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.header>

      {/* Mobile navigation */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" title={t.nav.menu} className="max-w-[88vw]">
          <div className="flex h-16 items-center justify-between border-b border-border px-5">
            <Wordmark name={brand.name} logoUrl={brand.logoUrl} className="text-[15px]" />
            <button onClick={() => setMobileOpen(false)} className="grid h-9 w-9 place-items-center rounded-full bg-muted" aria-label={t.nav.close}>
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <nav className="flex flex-col" aria-label="Mobile">
              {[...navItems, { key: "tryon", label: t.nav.tryOn, href: "/try-on" }, { key: "custom", label: t.nav.custom, href: "/collections/personalised" }].map((item, i) => (
                <motion.div key={item.key} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.06 + i * 0.04, duration: 0.5, ease: EASE }}>
                  <Link href={item.href} className="flex items-center justify-between border-b border-border py-4 text-[17px] font-semibold uppercase tracking-[0.02em]">
                    {item.label}
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </Link>
                </motion.div>
              ))}
            </nav>
            <p className="mb-3 mt-8 text-[11px] font-semibold uppercase tracking-[0.24em] text-accent-ink">{t.shop.category}</p>
            <div className="flex flex-wrap gap-2">
              {nav.categories.map((c) => (
                <Link key={c.slug} href={`/shop?category=${c.slug}`} className="rounded-full bg-muted px-3.5 py-2 text-sm">{L(c.name, c.nameBn)}</Link>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-border p-5">
            <div className="flex gap-4 text-sm font-medium">
              <Link href="/account">{t.nav.account}</Link>
              <Link href="/account/wishlist">{t.nav.wishlist}</Link>
              <Link href="/track-order">{t.nav.trackOrder}</Link>
            </div>
            <div className="flex items-center gap-2">
              <ThemeButton />
              <LanguagePill />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <SearchOverlay open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}

function DropColumn({ title, children, className, delay }: { title: string; children: React.ReactNode; className?: string; delay: number }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 + delay, duration: 0.5, ease: EASE }}>
      <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-accent-ink">{title}</p>
      <ul className="space-y-2.5">{children}</ul>
    </motion.div>
  );
}
function DropLink({ href, children, dot }: { href: string; children: React.ReactNode; dot?: string }) {
  return (
    <li>
      <Link href={href} className="group inline-flex items-center gap-2.5 text-[15px] text-foreground/75 transition hover:text-foreground">
        {dot && <span className="h-2 w-2 rounded-full ring-1 ring-black/10" style={{ background: dot }} aria-hidden />}
        <span className="transition-transform duration-300 group-hover:translate-x-0.5">{children}</span>
      </Link>
    </li>
  );
}
