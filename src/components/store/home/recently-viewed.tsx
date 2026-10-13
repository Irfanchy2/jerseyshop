"use client";
import * as React from "react";
import type { ProductCard as Card } from "@/lib/catalog/queries";
import { useStore } from "../store-provider";
import { ProductRail } from "./product-rail";

export function RecentlyViewed({ excludeId }: { excludeId?: string }) {
  const { recentlyViewed, t } = useStore();
  const [items, setItems] = React.useState<Card[]>([]);
  const ids = recentlyViewed.filter((id) => id !== excludeId).slice(0, 8);
  const key = ids.join(",");
  React.useEffect(() => {
    if (!key) return;
    fetch(`/api/products?ids=${key}`).then((r) => r.json()).then((d) => setItems(d.items ?? [])).catch(() => {});
  }, [key]);
  if (!key || items.length < 2) return null;
  return <ProductRail title={t.home.recentlyViewed} items={items} layout="carousel" />;
}
