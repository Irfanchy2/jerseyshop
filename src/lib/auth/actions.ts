"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, passwordProblems, verifyPassword } from "./password";
import { clientIp, createSession, destroySession } from "./session";
import { rateLimit } from "@/lib/rate-limit";
import { randomToken, sha256 } from "@/lib/crypto";
import { sendMail } from "@/lib/mail";
import { normalizeBdPhone } from "@/lib/phone";
import { CART_COOKIE } from "@/lib/cart/server";
import { cookies } from "next/headers";

export type FormState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean; message?: string } | null;

const safeNext = (n: FormDataEntryValue | null) => {
  const v = typeof n === "string" ? n : "";
  return v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/admin") ? v : "/account";
};

/** Attach the anonymous cart to the account that just signed in. */
async function claimCart(userId: string) {
  const token = (await cookies()).get(CART_COOKIE)?.value;
  if (token) await db.cart.updateMany({ where: { tokenHash: sha256(token), userId: null }, data: { userId } });
}

const LOCK_AFTER = 8;

export async function loginAction(_: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  if (!(await rateLimit(`login:${await clientIp()}`, 15, 900))) return { error: "Too many attempts. Please wait 15 minutes." };
  const user = await db.user.findUnique({ where: { email } });
  if (user?.lockedUntil && user.lockedUntil > new Date()) return { error: "Account temporarily locked after failed attempts. Try again later or reset your password." };
  const ok = user && user.isActive && (await verifyPassword(password, user.passwordHash));
  if (!user || !ok) {
    if (user) {
      const failed = user.failedLoginCount + 1;
      await db.user.update({ where: { id: user.id }, data: { failedLoginCount: failed, lockedUntil: failed >= LOCK_AFTER ? new Date(Date.now() + 15 * 60_000) : null } });
    }
    return { error: "Email or password is incorrect." };
  }
  await db.user.update({ where: { id: user.id }, data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() } });
  await createSession(user.id, "customer");
  await claimCart(user.id);
  redirect(safeNext(fd.get("next")));
}

const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  phone: z.string().trim().optional().refine((v) => !v || !!normalizeBdPhone(v), "Enter a valid Bangladesh mobile number"),
  password: z.string(),
  marketing: z.boolean(),
});

export async function registerAction(_: FormState, fd: FormData): Promise<FormState> {
  if (!(await rateLimit(`register:${await clientIp()}`, 5, 3600))) return { error: "Too many sign-ups from this network. Try again later." };
  const parsed = registerSchema.safeParse({
    name: fd.get("name"), email: fd.get("email"), phone: fd.get("phone") || undefined, password: fd.get("password"), marketing: fd.get("marketing") === "on",
  });
  if (!parsed.success) return { fieldErrors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])) };
  const pwProblem = passwordProblems(parsed.data.password);
  if (pwProblem) return { fieldErrors: { password: pwProblem } };
  if (await db.user.findUnique({ where: { email: parsed.data.email } })) return { fieldErrors: { email: "An account with this email already exists." } };
  const user = await db.user.create({
    data: {
      name: parsed.data.name, email: parsed.data.email, phone: parsed.data.phone ? normalizeBdPhone(parsed.data.phone) : null,
      passwordHash: await hashPassword(parsed.data.password),
      profile: { create: { marketingConsent: parsed.data.marketing, marketingConsentAt: parsed.data.marketing ? new Date() : null } },
    },
  });
  await createSession(user.id, "customer");
  await claimCart(user.id);
  redirect(safeNext(fd.get("next")));
}

export async function logoutAction() {
  await destroySession("customer");
  redirect("/");
}

export async function requestResetAction(_: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  if (!(await rateLimit(`reset:${await clientIp()}`, 5, 3600))) return { error: "Too many requests. Try again later." };
  const user = await db.user.findUnique({ where: { email } });
  if (user && user.isActive) {
    const token = randomToken(32);
    await db.passwordResetToken.create({ data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 60 * 60_000) } });
    const link = `${process.env.APP_URL ?? "http://localhost:3000"}/account/reset-password?token=${token}`;
    await sendMail(user.email, "Reset your Jersey Studio password", `Hi ${user.name},\n\nUse this link within 1 hour to set a new password:\n${link}\n\nIf you didn't request this, you can ignore this email.`);
  }
  // Same response either way to avoid revealing which emails have accounts.
  return { ok: true, message: "If an account exists for that email, we've sent a reset link. It expires in 1 hour." };
}

export async function resetPasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  const token = String(fd.get("token") ?? "");
  const password = String(fd.get("password") ?? "");
  const problem = passwordProblems(password);
  if (problem) return { fieldErrors: { password: problem } };
  const row = await db.passwordResetToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!row || row.usedAt || row.expiresAt < new Date()) return { error: "This reset link is invalid or has expired. Request a new one." };
  await db.$transaction([
    db.user.update({ where: { id: row.userId }, data: { passwordHash: await hashPassword(password), failedLoginCount: 0, lockedUntil: null } }),
    db.passwordResetToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
    db.session.deleteMany({ where: { userId: row.userId } }), // sign out everywhere
  ]);
  return { ok: true, message: "Your password has been updated. You can now sign in." };
}
