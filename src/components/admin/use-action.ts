"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/toast";
import type { ActionResult } from "@/lib/admin/guard";

/** Runs a server action, toasts the outcome and refreshes server data. */
export function useAction<A extends unknown[]>(fn: (...args: A) => Promise<ActionResult>) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const run = React.useCallback(
    (...args: A) =>
      new Promise<ActionResult>((resolve) => {
        start(async () => {
          const r = await fn(...args);
          if (r.ok) {
            setFieldErrors({});
            if (r.message) toast({ title: r.message });
            router.refresh();
          } else {
            setFieldErrors(r.fieldErrors ?? {});
            toast({ title: r.error, tone: "error" });
          }
          resolve(r);
        });
      }),
    [fn, router],
  );
  return { run, pending, fieldErrors };
}
