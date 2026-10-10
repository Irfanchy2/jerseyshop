import type { Metadata, Viewport } from "next";
import "./globals.css";
import { fontVariables } from "./fonts";
import { getLocale } from "@/lib/i18n/server";
import { getSettings } from "@/lib/settings";

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
  themeColor: "#f6f4ef",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale === "bn" ? "bn" : "en"} className={fontVariables} suppressHydrationWarning>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
