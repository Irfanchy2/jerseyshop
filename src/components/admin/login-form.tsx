"use client";
import { useActionState } from "react";
import { adminLoginAction } from "@/lib/admin/auth-actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

export function AdminLoginForm() {
  const [state, action, pending] = useActionState(adminLoginAction, null);
  return (
    <form action={action} className="space-y-4">
      {state?.error && <p className="rounded-lg bg-danger/10 p-3 text-sm text-danger" role="alert">{state.error}</p>}
      <Field label="Email" htmlFor="email"><Input id="email" name="email" type="email" autoComplete="username" required /></Field>
      <Field label="Password" htmlFor="password"><Input id="password" name="password" type="password" autoComplete="current-password" required /></Field>
      <Button type="submit" block size="lg" loading={pending}>Sign in</Button>
    </form>
  );
}
