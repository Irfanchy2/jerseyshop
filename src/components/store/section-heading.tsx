import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function SectionHeading({ eyebrow, title, href, linkLabel, className }: { eyebrow?: string; title: string; href?: string; linkLabel?: string; className?: string }) {
  return (
    <div className={cn("mb-8 flex items-end justify-between gap-6 md:mb-10", className)}>
      <div>
        {eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{eyebrow}</p>}
        <h2 className="text-balance font-heading text-[28px] font-bold leading-[1.05] md:text-[40px]">{title}</h2>
      </div>
      {href && (
        <Link href={href} className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold">
          <span className="underline-offset-4 group-hover:underline">{linkLabel}</span>
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
