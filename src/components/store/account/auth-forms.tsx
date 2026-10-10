"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { loginAction, registerAction, requestResetAction, resetPasswordAction, type FormState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

function Alert({ state }: { state: FormState }) {
  if (state?.error) return <p className="rounded-lg bg-danger/10 p-3 text-sm text-danger" role="alert">{state.error}</p>;
  if (state?.message) return <p className="rounded-lg bg-success/10 p-3 text-sm text-success" role="status">{state.message}</p>;
  return null;
}

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(loginAction, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <Alert state={state} />
      <Field label="Email" htmlFor="email"><Input id="email" name="email" type="email" autoComplete="email" required /></Field>
      <Field label="Password" htmlFor="password"><Input id="password" name="password" type="password" autoComplete="current-password" required /></Field>
      <div className="flex justify-end"><Link href="/account/forgot-password" className="text-sm underline underline-offset-4">Forgot password?</Link></div>
      <Button type="submit" block size="lg" loading={pending}>Sign in</Button>
      <p className="text-center text-sm text-muted-foreground">New here? <Link href={`/account/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-foreground underline underline-offset-4">Create an account</Link></p>
    </form>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(registerAction, null);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <Alert state={state} />
      <Field label="Full name" htmlFor="name" error={fe.name}><Input id="name" name="name" autoComplete="name" required aria-invalid={!!fe.name} /></Field>
      <Field label="Email" htmlFor="email" error={fe.email}><Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={!!fe.email} /></Field>
      <Field label="Mobile number (optional)" htmlFor="phone" error={fe.phone}><Input id="phone" name="phone" type="tel" placeholder="01XXXXXXXXX" aria-invalid={!!fe.phone} /></Field>
      <Field label="Password" htmlFor="password" error={fe.password} hint="At least 8 characters with letters and numbers"><Input id="password" name="password" type="password" autoComplete="new-password" required aria-invalid={!!fe.password} /></Field>
      <label className="flex items-start gap-3 text-sm text-muted-foreground"><input type="checkbox" name="marketing" className="mt-0.5 h-4 w-4" /> Email me about new kits and offers (optional)</label>
      <Button type="submit" block size="lg" loading={pending}>Create account</Button>
      <p className="text-center text-[12px] text-muted-foreground">By creating an account you agree to our <Link href="/terms" className="underline">terms</Link> and <Link href="/privacy-policy" className="underline">privacy policy</Link>.</p>
      <p className="text-center text-sm text-muted-foreground">Already have an account? <Link href="/account/login" className="font-medium text-foreground underline underline-offset-4">Sign in</Link></p>
    </form>
  );
}

export function ForgotForm() {
  const [state, action, pending] = useActionState(requestResetAction, null);
  return (
    <form action={action} className="space-y-4">
      <Alert state={state} />
      <Field label="Email" htmlFor="email"><Input id="email" name="email" type="email" required /></Field>
      <Button type="submit" block size="lg" loading={pending}>Send reset link</Button>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, null);
  if (state?.ok) return <div className="space-y-4"><Alert state={state} /><Button asChild block><Link href="/account/login">Sign in</Link></Button></div>;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <Alert state={state} />
      <Field label="New password" htmlFor="password" error={state?.fieldErrors?.password}><Input id="password" name="password" type="password" autoComplete="new-password" required /></Field>
      <Button type="submit" block size="lg" loading={pending}>Update password</Button>
    </form>
  );
}
