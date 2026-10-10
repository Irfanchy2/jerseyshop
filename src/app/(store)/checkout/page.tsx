import { getCustomer } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { CheckoutForm } from "@/components/store/checkout/checkout-form";

export const metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ payment?: string }> }) {
  const [{ payment }, user, settings] = await Promise.all([searchParams, getCustomer(), getSettings()]);
  const address = user ? await db.address.findFirst({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] }) : null;
  return (
    <CheckoutForm
      paymentNotice={payment === "failed" ? "Your online payment was not completed. The order was cancelled and no money was taken. You can try again or choose Cash on Delivery." : payment === "cancelled" ? "You cancelled the online payment. Your order was not placed." : null}
      user={user ? { name: user.name, email: user.email, phone: user.phone } : null}
      savedAddress={address ? { name: address.name, phone: address.phone, line1: address.line1, area: address.area, district: address.district, division: address.division, postcode: address.postcode ?? "" } : null}
      payments={{ cod: settings.payments.codEnabled, online: settings.payments.sslcommerzEnabled }}
    />
  );
}
