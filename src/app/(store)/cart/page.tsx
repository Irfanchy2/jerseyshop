import { CartPageClient } from "@/components/store/checkout/cart-page";
export const metadata = { title: "Your bag", robots: { index: false } };
export default function CartPage() {
  return <CartPageClient />;
}
