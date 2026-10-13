import { Suspense } from "react";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { getCustomer, getStaff } from "@/lib/auth/session";
import { getSetting } from "@/lib/settings";
import { cookies } from "next/headers";
import { StoreProvider } from "@/components/store/store-provider";
import { Header, type NavData } from "@/components/store/header";
import { Footer } from "@/components/store/footer";
import { CartDrawer } from "@/components/store/cart-drawer";
import { ThemeStyle } from "@/components/store/theme-style";
import { Toaster } from "@/components/ui/toast";
import { PageTracker } from "@/components/store/page-tracker";
import { ConsentAndPixels } from "@/components/store/consent-and-pixels";
import { FittingRoomProvider } from "@/components/store/fitting-room-context";
import { FittingRoom } from "@/components/store/fitting-room";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [settings, locale, t, user, categories, teams, collections, demoOrders] = await Promise.all([
    getSettings(),
    getLocale(),
    getDictionary(),
    getCustomer(),
    db.category.findMany({ where: { isActive: true, parentId: null }, orderBy: { sortOrder: "asc" }, select: { slug: true, name: true, nameBn: true } }),
    db.team.findMany({ where: { products: { some: { status: "ACTIVE" } } }, orderBy: { name: "asc" }, select: { slug: true, name: true, nameBn: true, primaryHex: true, kind: true } }),
    db.collection.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { slug: true, name: true, nameBn: true, accentHex: true } }),
    process.env.NODE_ENV !== "production" ? db.order.count({ where: { isDemo: true } }) : Promise.resolve(0),
  ]);
  // Staff can preview unpublished appearance changes (cookie set via /api/admin/preview).
  const previewing = (await cookies()).get("js_preview")?.value === "1" && !!(await getStaff());
  const appearance = previewing ? await getSetting("appearance", { draft: true }) : settings.appearance;
  const nav: NavData = {
    categories,
    clubs: teams.filter((x) => x.kind === "CLUB"),
    nationals: teams.filter((x) => x.kind === "NATIONAL"),
    collections,
  };
  return (
    <StoreProvider locale={locale} dictionary={t} signedIn={!!user}>
      <FittingRoomProvider>
      <ThemeStyle appearance={appearance} />
      {previewing && (
        <a href="/api/admin/preview?on=0" className="fixed bottom-4 left-4 z-[65] rounded-full bg-warning px-4 py-2 text-[12px] font-semibold text-white shadow-lg">Draft preview — exit</a>
      )}
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-full focus:bg-foreground focus:px-4 focus:py-2 focus:text-background">
        Skip to content
      </a>
      <Header brand={{ name: settings.brand.name, logoUrl: settings.brand.logoUrl }} announcement={settings.announcement.enabled ? settings.announcement.messages : []} nav={nav} />
      <main id="main">{children}</main>
      <Footer settings={settings} t={t} locale={locale} categories={categories} demoData={demoOrders > 0} />
      <CartDrawer />
      <Toaster />
      <Suspense fallback={null}>
        <PageTracker />
      </Suspense>
      <FittingRoom />
      <ConsentAndPixels ids={settings.marketing} />
      </FittingRoomProvider>
    </StoreProvider>
  );
}
