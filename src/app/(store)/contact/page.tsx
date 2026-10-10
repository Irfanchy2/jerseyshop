import { getSettings } from "@/lib/settings";
import { getCustomer } from "@/lib/auth/session";
import { ContactForm } from "@/components/store/account/account-forms";
export const metadata = { title: "Contact us" };
export default async function Contact() {
  const [s, user] = await Promise.all([getSettings(), getCustomer()]);
  return (
    <div className="container-x grid max-w-5xl gap-12 py-12 md:grid-cols-[1fr_1.4fr] md:py-20">
      <div>
        <h1 className="font-heading text-[34px] font-extrabold md:text-[48px]">Contact us</h1>
        <p className="mt-4 text-muted-foreground">Questions about sizing, personalisation or an order? We usually reply within one business day.</p>
        <dl className="mt-8 space-y-4 text-sm">
          <div><dt className="font-semibold">Phone / WhatsApp</dt><dd className="text-muted-foreground">{s.brand.supportPhone}</dd></div>
          <div><dt className="font-semibold">Email</dt><dd className="text-muted-foreground">{s.brand.supportEmail}</dd></div>
          <div><dt className="font-semibold">Studio</dt><dd className="text-muted-foreground">{s.brand.address}</dd></div>
        </dl>
      </div>
      <div className="rounded-[var(--radius)] border border-border bg-surface p-6 md:p-8"><ContactForm defaults={{ name: user?.name, email: user?.email }} /></div>
    </div>
  );
}
