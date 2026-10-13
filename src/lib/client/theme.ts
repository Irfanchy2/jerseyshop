"use client";
import * as React from "react";

/** Storefront light/dark preference: a class on <html> mirrored to the `theme` cookie (read server-side). */
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const isDark = () => document.documentElement.classList.contains("dark");

export function useTheme() {
  const dark = React.useSyncExternalStore(subscribe, isDark, () => false);
  const toggle = React.useCallback(() => {
    const next = !isDark();
    document.documentElement.classList.toggle("dark", next);
    document.cookie = `theme=${next ? "dark" : "light"}; path=/; max-age=31536000; samesite=lax`;
    listeners.forEach((fn) => fn());
  }, []);
  return { dark, toggle };
}

const noop = () => () => {};
/** Platform hint for the search shortcut label (⌘K on Apple devices, Ctrl K elsewhere). */
export function useIsApple() {
  return React.useSyncExternalStore(noop, () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent), () => true);
}
