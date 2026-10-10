"use client";

import * as React from "react";
import type { Dictionary, Locale } from "@/lib/i18n/dictionaries";
import type { PricedCart } from "@/lib/cart/server";
import { formatMoney } from "@/lib/money";
import { toast } from "@/components/ui/toast";
import { createIdListStore } from "@/lib/client/id-list-store";

type StoreCtx = {
  locale: Locale;
  t: Dictionary;
  money: (minor: number) => string;
  cart: PricedCart | null;
  cartOpen: boolean;
  setCartOpen: (v: boolean) => void;
  refreshCart: () => Promise<void>;
  addToCart: (variantId: string, quantity?: number, opts?: { customDesignId?: string | null; productName?: string; silent?: boolean }) => Promise<boolean>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  wishlist: Set<string>;
  toggleWishlist: (productId: string, name?: string) => void;
  recentlyViewed: string[];
  pushRecentlyViewed: (productId: string) => void;
  signedIn: boolean;
};

const Ctx = React.createContext<StoreCtx | null>(null);

export function useStore() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

const wishlistStore = createIdListStore("js:wishlist");
const recentStore = createIdListStore("js:recent", { max: 12 });

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error ?? "Request failed"), { status: res.status, data });
  return data as T;
}

export function StoreProvider({
  locale,
  dictionary,
  signedIn,
  children,
}: {
  locale: Locale;
  dictionary: Dictionary;
  signedIn: boolean;
  children: React.ReactNode;
}) {
  const [cart, setCart] = React.useState<PricedCart | null>(null);
  const [cartOpen, setCartOpen] = React.useState(false);
  const wishlistIds = React.useSyncExternalStore(wishlistStore.subscribe, wishlistStore.getSnapshot, wishlistStore.getServerSnapshot);
  const recentIds = React.useSyncExternalStore(recentStore.subscribe, recentStore.getSnapshot, recentStore.getServerSnapshot);
  const wishlist = React.useMemo(() => new Set(wishlistIds), [wishlistIds]);
  const recentlyViewed = recentIds as string[];

  const money = React.useCallback((m: number) => formatMoney(m, locale), [locale]);

  const refreshCart = React.useCallback(async () => {
    try {
      setCart(await api<PricedCart>("/api/cart"));
    } catch {
      /* offline */
    }
  }, []);

  React.useEffect(() => {
    api<PricedCart>("/api/cart").then(setCart).catch(() => {});
  }, []);

  React.useEffect(() => {
    if (!signedIn) {
      wishlistStore.setPersist(true);
      return;
    }
    // Signed in: merge any guest wishlist into the account, then mirror the server list in memory.
    const local = [...wishlistStore.getSnapshot()];
    wishlistStore.setPersist(false);
    api<{ ids: string[] }>("/api/wishlist", { method: local.length ? "POST" : "GET", body: local.length ? JSON.stringify({ productIds: local }) : undefined })
      .then((r) => {
        wishlistStore.clearPersisted();
        wishlistStore.set(r.ids);
      })
      .catch(() => {});
  }, [signedIn]);

  const addToCart: StoreCtx["addToCart"] = React.useCallback(
    async (variantId, quantity = 1, opts) => {
      try {
        const next = await api<PricedCart>("/api/cart", { method: "POST", body: JSON.stringify({ variantId, quantity, customDesignId: opts?.customDesignId ?? null }) });
        setCart(next);
        if (!opts?.silent) setCartOpen(true);
        return true;
      } catch (e) {
        toast({ title: (e as Error).message, tone: "error" });
        return false;
      }
    },
    [],
  );

  const updateItem = React.useCallback(async (itemId: string, quantity: number) => {
    try {
      const next = await api<PricedCart>(`/api/cart/items/${itemId}`, { method: "PATCH", body: JSON.stringify({ quantity }) });
      setCart(next);
    } catch (e) {
      toast({ title: (e as Error).message, tone: "error" });
    }
  }, []);

  const toggleWishlist = React.useCallback(
    (productId: string, name?: string) => {
      const current = wishlistStore.getSnapshot();
      const removing = current.includes(productId);
      wishlistStore.set(removing ? current.filter((x) => x !== productId) : [...current, productId]);
      if (signedIn) api("/api/wishlist", { method: "POST", body: JSON.stringify({ productIds: [productId], remove: removing }) }).catch(() => {});
      if (!removing) {
        toast({ title: dictionary.product.saved, description: name, action: { label: dictionary.nav.wishlist, href: "/account/wishlist" } });
        api("/api/track", { method: "POST", body: JSON.stringify({ name: "wishlist_add", productId }) }).catch(() => {});
      }
    },
    [signedIn, dictionary],
  );

  const pushRecentlyViewed = React.useCallback((productId: string) => {
    const current = recentStore.getSnapshot();
    if (current[0] === productId) return;
    recentStore.set([productId, ...current.filter((p) => p !== productId)]);
  }, []);

  const value = React.useMemo<StoreCtx>(
    () => ({ locale, t: dictionary, money, cart, cartOpen, setCartOpen, refreshCart, addToCart, updateItem, wishlist, toggleWishlist, recentlyViewed, pushRecentlyViewed, signedIn }),
    [locale, dictionary, money, cart, cartOpen, refreshCart, addToCart, updateItem, wishlist, toggleWishlist, recentlyViewed, pushRecentlyViewed, signedIn],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
