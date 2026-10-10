"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  ["/account", "Overview"], ["/account/orders", "Orders"], ["/account/wishlist", "Wishlist"], ["/account/addresses", "Addresses"],
  ["/account/designs", "Saved designs"], ["/account/try-ons", "Try-on images"], ["/account/privacy", "Privacy & data"],
] as const;

export function AccountNav() {
  const path = usePathname();
  return (
    <nav className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0" aria-label="Account">
      {ITEMS.map(([href, label]) => {
        const active = href === "/account" ? path === href : path.startsWith(href);
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn("whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition lg:rounded-lg", active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground")}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
