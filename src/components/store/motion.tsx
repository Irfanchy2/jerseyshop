"use client";

import * as React from "react";
import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";

export const EASE = [0.16, 1, 0.3, 1] as const;

/** Fades and lifts its children into place the first time they scroll into view. */
export function FadeUp({ delay = 0, y = 28, className, children, ...rest }: { delay?: number; y?: number } & HTMLMotionProps<"div">) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: 0.9, delay, ease: EASE }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** Stagger container: children using `staggerItem` animate in sequence when the group enters view. */
export function Stagger({ className, children, gap = 0.08, as = "div" }: { className?: string; children: React.ReactNode; gap?: number; as?: "div" | "ul" }) {
  const reduce = useReducedMotion();
  const Comp = as === "ul" ? motion.ul : motion.div;
  return (
    <Comp
      className={className}
      initial={reduce ? false : "hidden"}
      whileInView="show"
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: gap } } }}
    >
      {children}
    </Comp>
  );
}

export const staggerItem = {
  hidden: { opacity: 0, y: 36 },
  show: { opacity: 1, y: 0, transition: { duration: 0.85, ease: EASE } },
};

/** Masked word-by-word rise used for display headlines. */
export function RiseWords({ text, className, wordClassName, delay = 0, step = 0.08 }: { text: string; className?: string; wordClassName?: string; delay?: number; step?: number }) {
  const reduce = useReducedMotion();
  const words = text.split(" ").filter(Boolean);
  return (
    <span className={className}>
      {words.map((w, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.12em] align-top [margin-bottom:-0.12em]">
          <motion.span
            className={`inline-block ${wordClassName ?? ""}`}
            initial={reduce ? false : { y: "110%", rotate: 4 }}
            animate={{ y: "0%", rotate: 0 }}
            transition={{ duration: 1.05, delay: delay + i * step, ease: EASE }}
          >
            {w}
          </motion.span>
          {i < words.length - 1 && " "}
        </span>
      ))}
    </span>
  );
}
