"use client";
import * as React from "react";
import Script from "next/script";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type Ids = { ga4Id: string; gtmId: string; metaPixelId: string; tiktokPixelId: string; requireConsent: boolean };
const KEY = "js_consent";
const safeId = (s: string) => /^[A-Za-z0-9_-]{3,40}$/.test(s);

/**
 * Loads third-party marketing tags (GA4, GTM, Meta Pixel, TikTok Pixel) only after the visitor
 * consents (when consent is required in Admin → Marketing). IDs are validated before injection.
 */
export function ConsentAndPixels({ ids }: { ids: Ids }) {
  const any = [ids.ga4Id, ids.gtmId, ids.metaPixelId, ids.tiktokPixelId].some((x) => x && safeId(x));
  const [consent, setConsent] = React.useState<"granted" | "denied" | null>(null);
  React.useEffect(() => {
    const m = document.cookie.match(/(?:^|; )js_consent=(granted|denied)/);
    setConsent(m ? (m[1] as "granted" | "denied") : ids.requireConsent ? null : "granted");
  }, [ids.requireConsent]);
  if (!any) return null;
  const decide = (v: "granted" | "denied") => {
    document.cookie = `${KEY}=${v}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    setConsent(v);
  };
  return (
    <>
      {consent === "granted" && (
        <>
          {ids.ga4Id && safeId(ids.ga4Id) && (
            <>
              <Script src={`https://www.googletagmanager.com/gtag/js?id=${ids.ga4Id}`} strategy="afterInteractive" />
              <Script id="ga4" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${ids.ga4Id}');`}</Script>
            </>
          )}
          {ids.gtmId && safeId(ids.gtmId) && (
            <Script id="gtm" strategy="afterInteractive">{`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${ids.gtmId}');`}</Script>
          )}
          {ids.metaPixelId && safeId(ids.metaPixelId) && (
            <Script id="meta-pixel" strategy="afterInteractive">{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${ids.metaPixelId}');fbq('track','PageView');`}</Script>
          )}
          {ids.tiktokPixelId && safeId(ids.tiktokPixelId) && (
            <Script id="tiktok-pixel" strategy="afterInteractive">{`!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};ttq._t[e]=+new Date;ttq._o=ttq._o||{};ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript";o.async=!0;o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load('${ids.tiktokPixelId}');ttq.page();}(window,document,'ttq');`}</Script>
          )}
        </>
      )}
      {consent === null && (
        <div className="fixed inset-x-3 bottom-3 z-[55] mx-auto max-w-xl rounded-[var(--radius)] border border-border bg-surface p-4 shadow-2xl sm:bottom-5 sm:p-5" role="dialog" aria-label="Cookie consent">
          <p className="text-sm">
            We use optional analytics and advertising cookies to improve the shop and measure campaigns. See our <Link href="/privacy-policy" className="underline">privacy policy</Link>.
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={() => decide("granted")}>Accept</Button>
            <Button size="sm" variant="outline" onClick={() => decide("denied")}>Only necessary</Button>
          </div>
        </div>
      )}
    </>
  );
}
