import type { Metadata, Viewport } from "next";
import "./globals.css";
import { fontVariables } from "./fonts";
import { getLocale } from "@/lib/i18n/server";
import { getSettings } from "@/lib/settings";
import { cookies } from "next/headers";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
    title: { default: s.seo.defaultTitle, template: `%s | ${s.brand.name}` },
    description: s.seo.defaultDescription,
    openGraph: { siteName: s.brand.name, type: "website", locale: "en_BD" },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0e11" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [locale, jar] = await Promise.all([getLocale(), cookies()]);
  // Storefront theme preference; the header toggle writes this cookie and flips the class client-side.
  const dark = jar.get("theme")?.value === "dark";
  return (
    <html lang={locale === "bn" ? "bn" : "en"} className={`${fontVariables}${dark ? " dark" : ""}`} suppressHydrationWarning>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
