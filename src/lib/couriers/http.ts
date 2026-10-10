import "server-only";
import { CourierError } from "./types";

/** JSON HTTP with timeout and error normalisation. Never logs request headers (they carry credentials). */
export async function courierFetch<T>(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<{ status: number; data: T }> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(init.timeoutMs ?? 20000), headers: { Accept: "application/json", "Content-Type": "application/json", ...(init.headers ?? {}) } });
  } catch (e) {
    throw new CourierError(`Network error contacting courier: ${(e as Error).message}`, undefined, true);
  }
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text.slice(0, 500) };
  }
  if (!res.ok) {
    const msg = (data as { message?: string; errors?: unknown })?.message ?? `HTTP ${res.status}`;
    throw new CourierError(`Courier API error: ${msg}`, res.status, res.status >= 500 || res.status === 429, data);
  }
  return { status: res.status, data: data as T };
}
