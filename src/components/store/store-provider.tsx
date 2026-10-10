"use client";

import * as React from "react";
import type { Dictionary, Locale } from "@/lib/i18n/dictionaries";
import type { PricedCart } from "@/lib/cart/server";
import { formatMoney } from "@/lib/money";
import { toast } from "@/components/ui/toast";

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

const WISHLIST_KEY = "js:wishlist";
const RECENT_KEY = "js:recent";

function readLocal(key: string): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, 50) : [];
  } catch {
    return [];
  }
}
function writeLocal(key: string, v: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* storage unavailable */
  }
}

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
  const [wishlist, setWishlist] = React.useState<Set<string>>(new Set());
  const [recentlyViewed, setRecent] = React.useState<string[]>([]);

  const money = React.useCallback((m: number) => formatMoney(m, locale), [locale]);

  const refreshCart = React.useCallback(async () => {
    try {
      setCart(await api<PricedCart>("/api/cart"));
    } catch {
      /* offline */
    }
  }, []);

  React.useEffect(() => {
    refreshCart();
    setRecent(readLocal(RECENT_KEY));
    const local = readLocal(WISHLIST_KEY);
    setWishlist(new Set(local));
    if (signedIn) {
      // Merge any guest wishlist into the account, then use the server list.
      api<{ ids: string[] }>("/api/wishlist", { method: local.length ? "POST" : "GET", body: local.length ? JSON.stringify({ productIds: local }) : undefined })
        .then((r) => {
          setWishlist(new Set(r.ids));
          writeLocal(WISHLIST_KEY, []);
        })
        .catch(() => {});
    }
  }, [refreshCart, signedIn]);

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
      setWishlist((prev) => {
        const next = new Set(prev);
        const removing = next.has(productId);
        if (removing) next.delete(productId);
        else next.add(productId);
        if (signedIn) {
          api("/api/wishlist", { method: "POST", body: JSON.stringify({ productIds: [productId], remove: removing }) }).catch(() => {});
        } else writeLocal(WISHLIST_KEY, [...next]);
        if (!removing) {
          toast({ title: dictionary.product.saved, description: name, action: { label: dictionary.nav.wishlist, href: "/account/wishlist" } });
          api("/api/track", { method: "POST", body: JSON.stringify({ name: "wishlist_add", productId }) }).catch(() => {});
        }
        return next;
      });
    },
    [signedIn, dictionary],
  );

  const pushRecentlyViewed = React.useCallback((productId: string) => {
    setRecent((prev) => {
      const next = [productId, ...prev.filter((p) => p !== productId)].slice(0, 12);
      writeLocal(RECENT_KEY, next);
      return next;
    });
  }, []);

  const value = React.useMemo<StoreCtx>(
    () => ({ locale, t: dictionary, money, cart, cartOpen, setCartOpen, refreshCart, addToCart, updateItem, wishlist, toggleWishlist, recentlyViewed, pushRecentlyViewed, signedIn }),
    [locale, dictionary, money, cart, cartOpen, refreshCart, addToCart, updateItem, wishlist, toggleWishlist, recentlyViewed, pushRecentlyViewed, signedIn],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
