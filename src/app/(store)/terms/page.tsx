import { getSettings } from "@/lib/settings";
import { ProsePage } from "@/components/store/prose-page";
export const metadata = { title: "Terms" };
export default async function Terms() {
  const s = await getSettings();
  return (
    <ProsePage title="Terms of service" updated="October 2026">
      <p>By using {s.brand.name} you agree to these terms.</p>
      <h2>Orders & pricing</h2>
      <p>Prices are in Bangladeshi Taka (BDT) and include VAT where applicable. We may cancel orders affected by obvious pricing errors or stock issues and will refund any payment received.</p>
      <h2>Personalisation</h2>
      <p>You are responsible for the names and numbers you submit. We may refuse offensive or infringing text.</p>
      <h2>AI previews</h2>
      <p>Virtual try-on images are AI-generated visualisations for guidance only and do not guarantee fit, size, colour or fabric appearance.</p>
      <h2>Products</h2>
      <p>Our jerseys are original designs and supporters&apos; editions; they are not official club or federation merchandise unless explicitly stated.</p>
      <h2>Contact</h2>
      <p>{s.brand.supportEmail} · {s.brand.supportPhone}</p>
    </ProsePage>
  );
}
