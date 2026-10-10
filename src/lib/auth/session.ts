import "server-only";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { db } from "@/lib/db";
import { hashIp, randomToken, sha256 } from "@/lib/crypto";
import type { PermissionKey } from "./permissions";

export const CUSTOMER_COOKIE = "js_session";
export const ADMIN_COOKIE = "js_admin";
const CUSTOMER_TTL_MS = 30 * 24 * 3600 * 1000;
const ADMIN_TTL_MS = 12 * 3600 * 1000;

type Scope = "customer" | "admin";

function cookieName(scope: Scope) {
  return scope === "admin" ? ADMIN_COOKIE : CUSTOMER_COOKIE;
}

export async function clientIp(): Promise<string | null> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
}

export async function createSession(userId: string, scope: Scope) {
  const token = randomToken(32);
  const ttl = scope === "admin" ? ADMIN_TTL_MS : CUSTOMER_TTL_MS;
  const h = await headers();
  await db.session.create({
    data: {
      id: sha256(token),
      userId,
      scope,
      expiresAt: new Date(Date.now() + ttl),
      userAgent: h.get("user-agent")?.slice(0, 250) ?? null,
      ipHash: hashIp(await clientIp()),
    },
  });
  const jar = await cookies();
  jar.set(cookieName(scope), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(ttl / 1000),
  });
}

export async function destroySession(scope: Scope) {
  const jar = await cookies();
  const token = jar.get(cookieName(scope))?.value;
  if (token) await db.session.deleteMany({ where: { id: sha256(token) } });
  jar.delete(cookieName(scope));
}

async function loadSession(scope: Scope) {
  const jar = await cookies();
  const token = jar.get(cookieName(scope))?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { id: sha256(token) },
    include: {
      user: {
        include: { role: { include: { permissions: true } } },
      },
    },
  });
  if (!session || session.scope !== scope || session.expiresAt < new Date() || !session.user.isActive) return null;
  // Touch at most every 10 minutes
  if (Date.now() - session.lastSeenAt.getTime() > 10 * 60 * 1000) {
    await db.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } }).catch(() => {});
  }
  return session;
}

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  kind: "CUSTOMER" | "STAFF";
};

export const getCustomer = cache(async (): Promise<CurrentUser | null> => {
  const s = await loadSession("customer");
  if (!s) return null;
  const { id, name, email, phone, kind } = s.user;
  return { id, name, email, phone, kind };
});

export type StaffUser = CurrentUser & { roleName: string; permissions: Set<PermissionKey> };

export const getStaff = cache(async (): Promise<StaffUser | null> => {
  const s = await loadSession("admin");
  if (!s || s.user.kind !== "STAFF" || !s.user.role) return null;
  const { id, name, email, phone, kind } = s.user;
  return {
    id,
    name,
    email,
    phone,
    kind,
    roleName: s.user.role.name,
    permissions: new Set(s.user.role.permissions.map((p) => p.permissionKey as PermissionKey)),
  };
});

export class AuthError extends Error {
  constructor(public status: 401 | 403, message: string) {
    super(message);
  }
}

/** Throws AuthError unless the current admin session has the permission. */
export async function requirePermission(permission: PermissionKey): Promise<StaffUser> {
  const staff = await getStaff();
  if (!staff) throw new AuthError(401, "Not signed in");
  if (!staff.permissions.has(permission)) throw new AuthError(403, "You do not have permission for this action");
  return staff;
}
