"use client";
import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";

/** First-party page view tracking (anonymous session id cookie). */
export function PageTracker() {
  const pathname = usePathname();
  const sp = useSearchParams();
  React.useEffect(() => {
    if (!document.cookie.includes("js_sid=")) {
      const id = crypto.randomUUID();
      document.cookie = `js_sid=${id}; path=/; max-age=${60 * 60 * 24 * 180}; samesite=lax`;
    }
    const body = { name: "page_view", path: pathname, utmSource: sp.get("utm_source"), utmCampaign: sp.get("utm_campaign") };
    fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), keepalive: true }).catch(() => {});
  }, [pathname, sp]);
  return null;
}
