"use client";
import * as React from "react";
import { ArrowRight, Check } from "lucide-react";
import { useStore, api } from "./store-provider";
import { cn } from "@/lib/utils";

export function NewsletterForm({ source = "footer", tone = "light" }: { source?: string; tone?: "light" | "dark" }) {
  const { t } = useStore();
  const [email, setEmail] = React.useState("");
  const [state, setState] = React.useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = React.useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("loading");
    try {
      await api("/api/newsletter", { method: "POST", body: JSON.stringify({ email, source }) });
      setState("done");
    } catch (err) {
      setError((err as Error).message);
      setState("error");
    }
  };
  if (state === "done")
    return (
      <p className="flex items-center gap-2 text-sm font-medium" role="status">
        <Check className="h-4 w-4" /> {t.home.subscribed}
      </p>
    );
  return (
    <form onSubmit={submit} className="w-full">
      <div className={cn("flex items-center border-b pb-2 transition-colors focus-within:border-current", tone === "dark" ? "border-white/30" : "border-foreground/25")}>
        <label htmlFor={`nl-${source}`} className="sr-only">{t.home.emailPlaceholder}</label>
        <input
          id={`nl-${source}`}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t.home.emailPlaceholder}
          className="h-10 w-full bg-transparent text-[15px] outline-none placeholder:opacity-60"
        />
        <button type="submit" disabled={state === "loading"} className="inline-flex h-10 items-center gap-1.5 whitespace-nowrap text-sm font-semibold" aria-label={t.home.subscribe}>
          {t.home.subscribe} <ArrowRight className="h-4 w-4" />
        </button>
      </div>
      {state === "error" && <p className="mt-2 text-xs text-danger" role="alert">{error}</p>}
      <p className="mt-2 text-[11px] opacity-80">By subscribing you agree to receive marketing emails. Unsubscribe anytime.</p>
    </form>
  );
}
