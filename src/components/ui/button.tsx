import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium select-none transition-[background-color,color,border-color,transform,opacity] duration-200 ease-out active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none [&_svg]:shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2",
  {
    variants: {
      variant: {
        primary: "bg-foreground text-background hover:bg-foreground/85",
        accent: "bg-accent text-accent-foreground hover:brightness-110",
        outline: "border border-foreground/20 bg-transparent text-foreground hover:border-foreground hover:bg-foreground/[0.03]",
        secondary: "bg-muted text-foreground hover:bg-muted/70",
        ghost: "bg-transparent text-foreground hover:bg-foreground/5",
        danger: "bg-danger text-white hover:bg-danger/90",
        link: "bg-transparent text-foreground underline-offset-4 hover:underline px-0 h-auto",
        inverse: "bg-white text-black hover:bg-white/90",
      },
      size: {
        sm: "h-9 px-3.5 text-[13px] rounded-btn",
        md: "h-11 px-5 text-sm rounded-btn",
        lg: "h-13 px-7 text-[15px] rounded-btn",
        icon: "h-10 w-10 rounded-full",
        "icon-sm": "h-8 w-8 rounded-full",
      },
      block: { true: "w-full" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, block, asChild, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, block }), className)}
        disabled={asChild ? undefined : disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <>
            {loading && <span className="absolute inset-0 grid place-items-center"><Spinner /></span>}
            <span className={cn("inline-flex items-center gap-2", loading && "invisible")}>{children}</span>
          </>
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("h-4 w-4 animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
