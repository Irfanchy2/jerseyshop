import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { ProsePage } from "@/components/store/prose-page";
export const metadata = { title: "Shipping policy" };
export default async function Shipping() {
  const [rates, s] = await Promise.all([db.shippingRate.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }), getSettings()]);
  return (
    <ProsePage title="Shipping policy">
      <p>{s.delivery.processingDaysText} Personalised jerseys need up to 48 hours of printing before dispatch.</p>
      <h2>Delivery charges</h2>
      <ul>{rates.map((r) => <li key={r.id}>{r.name}: {formatMoney(r.feeMinor)} — {r.etaText}</li>)}</ul>
      {s.delivery.freeShippingThresholdMinor != null && <p>Delivery is free on orders of {formatMoney(s.delivery.freeShippingThresholdMinor)} or more (after discounts).</p>}
      <h2>Couriers</h2>
      <p>We ship with trusted Bangladeshi couriers such as Steadfast and Pathao. When your parcel is booked, the tracking code appears on your order tracking page.</p>
      <h2>Cash on Delivery</h2>
      <p>Please keep the exact amount ready. You may check the parcel in front of the rider before paying.</p>
    </ProsePage>
  );
}
