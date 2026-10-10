"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { clientIp, createSession, destroySession } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import type { FormState } from "@/lib/auth/actions";

export async function adminLoginAction(_: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  if (!(await rateLimit(`admin-login:${await clientIp()}`, 10, 900))) return { error: "Too many attempts. Please wait 15 minutes." };
  const user = await db.user.findUnique({ where: { email } });
  if (user?.lockedUntil && user.lockedUntil > new Date()) return { error: "Account temporarily locked. Try again later." };
  const ok = user && user.kind === "STAFF" && user.isActive && user.roleId && (await verifyPassword(password, user.passwordHash));
  if (!user || !ok) {
    if (user) {
      const failed = user.failedLoginCount + 1;
      await db.user.update({ where: { id: user.id }, data: { failedLoginCount: failed, lockedUntil: failed >= 6 ? new Date(Date.now() + 30 * 60_000) : null } });
      await audit({ actorId: user.id, action: "auth.admin_login_failed", entityType: "user", entityId: user.id });
    }
    return { error: "Invalid credentials or not a staff account." };
  }
  await db.user.update({ where: { id: user.id }, data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() } });
  await createSession(user.id, "admin");
  await audit({ actorId: user.id, action: "auth.admin_login", entityType: "user", entityId: user.id });
  redirect("/admin");
}

export async function adminLogoutAction() {
  await destroySession("admin");
  redirect("/admin/login");
}
