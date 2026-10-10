import { getSettings } from "@/lib/settings";
import { ProsePage } from "@/components/store/prose-page";
export const metadata = { title: "Return policy" };
export default async function Returns() {
  const s = await getSettings();
  const d = s.delivery.returnPolicyDays;
  return (
    <ProsePage title="Return & exchange policy">
      <h2>Size exchanges</h2>
      <p>Unworn, unwashed, non-personalised jerseys with tags attached can be exchanged within {d} days of delivery. Contact us with your order number to arrange it.</p>
      <h2>Personalised jerseys</h2>
      <p>Items printed with a name or number are made to order and can be returned only if they arrive faulty, damaged or misprinted.</p>
      <h2>Faulty or wrong items</h2>
      <p>Tell us within 48 hours of delivery with photos and we&apos;ll replace the item or refund you, including delivery charges.</p>
      <h2>Refunds</h2>
      <p>Approved refunds are issued to the original payment method, or by bKash/bank transfer for Cash on Delivery orders, within 7 business days.</p>
    </ProsePage>
  );
}
