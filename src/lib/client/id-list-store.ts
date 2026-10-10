"use client";

/**
 * Tiny external store for browser-persisted id lists (wishlist, recently viewed),
 * consumed with useSyncExternalStore so server and client renders stay consistent.
 */
type Listener = () => void;
const EMPTY: readonly string[] = Object.freeze([]);

export function createIdListStore(key: string, opts: { max?: number } = {}) {
  let cache: readonly string[] | null = null;
  let persist = true;
  const listeners = new Set<Listener>();

  const read = (): readonly string[] => {
    if (cache) return cache;
    try {
      const v = JSON.parse(localStorage.getItem(key) ?? "[]");
      cache = Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, opts.max ?? 100) : [];
    } catch {
      cache = [];
    }
    return cache;
  };
  const write = (next: string[]) => {
    cache = next.slice(0, opts.max ?? 100);
    if (persist) {
      try {
        localStorage.setItem(key, JSON.stringify(cache));
      } catch {
        /* storage unavailable */
      }
    }
    listeners.forEach((l) => l());
  };
  return {
    subscribe(l: Listener) {
      listeners.add(l);
      const onStorage = (e: StorageEvent) => {
        if (e.key === key) {
          cache = null;
          l();
        }
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(l);
        window.removeEventListener("storage", onStorage);
      };
    },
    getSnapshot: read,
    getServerSnapshot: () => EMPTY,
    set: write,
    /** Switch to in-memory mode (e.g. signed-in wishlist lives on the server). */
    setPersist(p: boolean) {
      persist = p;
    },
    clearPersisted() {
      try {
        localStorage.removeItem(key);
      } catch {}
    },
  };
}
