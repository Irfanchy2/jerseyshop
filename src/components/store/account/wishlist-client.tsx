"use client";
import * as React from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { useStore } from "../store-provider";
import type { ProductCard } from "@/lib/catalog/queries";
import { ProductGrid } from "../product-card";
import { Button } from "@/components/ui/button";

export function WishlistClient() {
  const { wishlist, signedIn, t } = useStore();
  const [items, setItems] = React.useState<ProductCard[] | null>(null);
  const ids = [...wishlist].join(",");
  React.useEffect(() => {
    if (!ids) return setItems([]);
    fetch(`/api/products?ids=${ids}`).then((r) => r.json()).then((d) => setItems(d.items ?? [])).catch(() => setItems([]));
  }, [ids]);
  return (
    <div className="container-x py-10 md:py-14">
      <h1 className="font-heading text-[32px] font-extrabold md:text-[44px]">{t.nav.wishlist}</h1>
      {!signedIn && <p className="mt-2 text-sm text-muted-foreground">Saved on this device. <Link href="/account/login?next=/account/wishlist" className="underline">Sign in</Link> to keep your wishlist across devices.</p>}
      <div className="mt-10">
        {items === null ? null : items.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Heart className="h-10 w-10 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">Nothing saved yet. Tap the heart on any jersey to save it here.</p>
            <Button asChild className="mt-6"><Link href="/shop">{t.home.shopJerseys}</Link></Button>
          </div>
        ) : (
          <ProductGrid items={items} />
        )}
      </div>
    </div>
  );
}
