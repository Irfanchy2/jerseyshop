import { WishlistClient } from "@/components/store/account/wishlist-client";
export const metadata = { title: "Wishlist", robots: { index: false } };
/** Works for guests (local wishlist) and signed-in customers (synced to the account). */
export default function WishlistPage() {
  return <WishlistClient />;
}
