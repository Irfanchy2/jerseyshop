import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "@/lib/auth/session";

export class HttpError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

export function json<T>(data: T, init?: number | ResponseInit) {
  return NextResponse.json(data, typeof init === "number" ? { status: init } : init);
}

/**
 * CSRF defence for cookie-authenticated JSON route handlers: mutating requests must come
 * from our own origin. (Server Actions get equivalent protection from Next.js.)
 */
export function assertSameOrigin(req: Request) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return;
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!origin || !host) throw new HttpError(403, "Missing origin");
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new HttpError(403, "Bad origin");
  }
  if (originHost !== host) throw new HttpError(403, "Cross-origin request blocked");
}

export function handleApiError(err: unknown) {
  if (err instanceof AuthError) return json({ error: err.message }, err.status);
  if (err instanceof HttpError) return json({ error: err.message, code: err.code }, err.status);
  if (err instanceof ZodError)
    return json({ error: "Validation failed", issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })) }, 400);
  console.error(err);
  return json({ error: "Something went wrong. Please try again." }, 500);
}

/** Wrap a route handler with origin check + uniform error handling. */
export function route<Ctx = unknown>(fn: (req: Request, ctx: Ctx) => Promise<Response>) {
  return async (req: Request, ctx: Ctx) => {
    try {
      assertSameOrigin(req);
      return await fn(req, ctx);
    } catch (e) {
      return handleApiError(e);
    }
  };
}
