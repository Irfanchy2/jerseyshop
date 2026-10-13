"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { EASE } from "./motion";

/** Light/bold split: the last word carries the weight ("Shop by **Category**"). */
export function SplitTitle({ text }: { text: string }) {
  const words = text.trim().split(/\s+/);
  if (words.length < 2) return <span className="font-bold">{text}</span>;
  return (
    <>
      <span className="font-light">{words.slice(0, -1).join(" ")}</span> <span className="font-bold">{words[words.length - 1]}</span>
    </>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  sub,
  href,
  linkLabel,
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: string;
  sub?: string;
  href?: string;
  linkLabel?: string;
  align?: "left" | "center";
  className?: string;
}) {
  const reduce = useReducedMotion();
  const item = (i: number) => ({
    initial: reduce ? false : { opacity: 0, y: 22 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "0px 0px -10% 0px" },
    transition: { duration: 0.85, delay: i * 0.08, ease: EASE },
  });
  const centered = align === "center";
  return (
    <div className={cn("mb-9 flex gap-6 md:mb-12", centered ? "flex-col items-center text-center" : "items-end justify-between", className)}>
      <div className={cn(centered && "max-w-2xl")}>
        {eyebrow && (
          <motion.p {...item(0)} className="mb-3 text-[12px] font-medium uppercase tracking-[0.32em] text-accent-ink md:text-[13px]">
            {eyebrow}
          </motion.p>
        )}
        <motion.h2 {...item(1)} className="text-balance font-heading text-[30px] leading-[1.08] tracking-[-0.03em] md:text-[42px]">
          <SplitTitle text={title} />
        </motion.h2>
        {sub && (
          <motion.p {...item(2)} className="mt-4 text-[15px] leading-relaxed text-muted-foreground md:text-[16px]">
            {sub}
          </motion.p>
        )}
      </div>
      {href && !centered && (
        <motion.div {...item(2)} className="shrink-0">
          <Link href={href} className="group inline-flex items-center gap-2 text-[15px] text-muted-foreground transition-colors hover:text-foreground">
            {linkLabel}
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </motion.div>
      )}
    </div>
  );
}
