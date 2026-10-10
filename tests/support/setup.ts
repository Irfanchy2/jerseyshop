import { AsyncLocalStorage } from "node:async_hooks";
import { vi } from "vitest";
import { applyTestEnv } from "./env";

applyTestEnv();

/** Per-call cookie jars so concurrent "requests" in a test don't share cookies. */
const jarStore = new AsyncLocalStorage<Map<string, string>>();
const defaultJar = new Map<string, string>();
export function withCookies<T>(jar: Map<string, string>, fn: () => Promise<T>) {
  return jarStore.run(jar, fn);
}
const jar = () => jarStore.getStore() ?? defaultJar;

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar().has(name) ? { name, value: jar().get(name)! } : undefined),
    set: (name: string, value: string) => void jar().set(name, value),
    delete: (name: string) => void jar().delete(name),
  }),
  headers: async () => new Headers({ "x-forwarded-for": "127.0.0.1", "user-agent": "vitest" }),
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));
