import Link from "next/link";
import { ProsePage } from "@/components/store/prose-page";
import { getSettings } from "@/lib/settings";
export const metadata = { title: "About us" };
export default async function About() {
  const s = await getSettings();
  return (
    <ProsePage title={`About ${s.brand.name}`}>
      <p>{s.footer.about}</p>
      <p>We design original jerseys and fan kits, print names and numbers in-house, and deliver across all 64 districts with Cash on Delivery. Every shirt is cut from a breathable, quick-dry knit chosen for Bangladesh&apos;s heat and humidity.</p>
      <h2>What we stand for</h2>
      <ul><li>Honest pricing in BDT — no hidden fees at checkout.</li><li>Real reviews only from customers who received their order.</li><li>Your photos stay private: virtual try-on images are deleted automatically.</li></ul>
      <p><Link href="/shop">Shop the collection</Link> or <Link href="/contact">get in touch</Link>.</p>
    </ProsePage>
  );
}
