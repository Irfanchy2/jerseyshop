import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide whitespace-nowrap", {
  variants: {
    variant: {
      default: "bg-foreground text-background",
      outline: "border border-border text-foreground",
      muted: "bg-muted text-muted-foreground",
      sale: "bg-sale text-white",
      accent: "bg-accent text-accent-foreground",
      success: "bg-success/12 text-success",
      warning: "bg-warning/12 text-warning",
      danger: "bg-danger/12 text-danger",
      info: "bg-sky-500/12 text-sky-700 dark:text-sky-300",
    },
  },
  defaultVariants: { variant: "default" },
});

export function Badge({ className, variant, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
