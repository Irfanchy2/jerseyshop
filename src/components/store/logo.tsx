import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ name, logoUrl, className }: { name: string; logoUrl?: string | null; className?: string }) {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2 font-heading text-[17px] font-extrabold tracking-[0.18em] uppercase", className)} aria-label={`${name} home`}>
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt={name} className="h-7 w-auto" />
      ) : (
        <>
          <svg viewBox="0 0 48 36" className="h-5 w-auto" aria-hidden fill="currentColor">
            <path d="M0 6 L14 6 L24 20 L34 6 L48 6 L24 36 Z" />
            <path d="M8 0 L18 0 L24 8 L30 0 L40 0 L24 20 Z" opacity=".45" />
          </svg>
          <span>{name}</span>
        </>
      )}
    </Link>
  );
}
