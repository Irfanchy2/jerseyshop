"use client";
import { NewsletterForm } from "../newsletter-form";
import { useStore } from "../store-provider";

export function NewsletterBlock() {
  const { t } = useStore();
  return (
    <section className="section-y">
      <div className="container-x">
        <div className="grid items-end gap-8 rounded-[calc(var(--radius)*1.4)] bg-accent p-8 text-accent-foreground md:grid-cols-2 md:p-14">
          <div>
            <h2 className="font-heading text-[30px] font-extrabold leading-[1.05] md:text-[44px]">{t.home.newsletterTitle}</h2>
            <p className="mt-3 max-w-md opacity-75">{t.home.newsletterBody}</p>
          </div>
          <NewsletterForm source="home" tone="dark" />
        </div>
      </div>
    </section>
  );
}
