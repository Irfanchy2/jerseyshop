import Link from "next/link";
import { FacebookIcon as Facebook, InstagramIcon as Instagram, YoutubeIcon as Youtube } from "./social-icons";
import type { Settings } from "@/lib/settings";
import type { Dictionary, Locale } from "@/lib/i18n/dictionaries";
import { NewsletterForm } from "./newsletter-form";
import { Logo } from "./logo";

export function Footer({ settings, t, locale, categories, demoData }: { settings: Settings; t: Dictionary; locale: Locale; categories: { slug: string; name: string; nameBn: string | null }[]; demoData: boolean }) {
  const s = settings.footer.social;
  const socials = [
    { href: s.facebook, label: "Facebook", icon: Facebook },
    { href: s.instagram, label: "Instagram", icon: Instagram },
    { href: s.youtube, label: "YouTube", icon: Youtube },
  ].filter((x) => x.href);
  return (
    <footer className="mt-12 border-t border-border bg-surface">
      <div className="container-x grid gap-12 py-16 md:grid-cols-12">
        <div className="md:col-span-4">
          <Logo name={settings.brand.name} logoUrl={settings.brand.logoUrl} />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">{locale === "bn" ? settings.footer.aboutBn : settings.footer.about}</p>
          <div className="mt-8 max-w-sm">
            <p className="mb-2 font-heading text-[15px] font-semibold">{t.home.newsletterTitle}</p>
            <NewsletterForm source="footer" />
          </div>
        </div>
        <nav className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:col-span-8 md:pl-10" aria-label="Footer">
          <FooterCol title={t.footer.shop}>
            {categories.map((c) => <FooterLink key={c.slug} href={`/shop?category=${c.slug}`}>{locale === "bn" && c.nameBn ? c.nameBn : c.name}</FooterLink>)}
            <FooterLink href="/try-on">{t.nav.tryOn}</FooterLink>
          </FooterCol>
          <FooterCol title={t.footer.help}>
            <FooterLink href="/track-order">{t.nav.trackOrder}</FooterLink>
            <FooterLink href="/shipping-policy">{t.footer.shipping}</FooterLink>
            <FooterLink href="/return-policy">{t.footer.returns}</FooterLink>
            <FooterLink href="/faq">{t.footer.faq}</FooterLink>
            <FooterLink href="/contact">{t.footer.contact}</FooterLink>
          </FooterCol>
          <FooterCol title={t.footer.company}>
            <FooterLink href="/about">{t.footer.about}</FooterLink>
            <FooterLink href="/privacy-policy">{t.footer.privacy}</FooterLink>
            <FooterLink href="/terms">{t.footer.terms}</FooterLink>
            <li className="pt-2 text-sm text-muted-foreground">
              <a href={`tel:${settings.brand.supportPhone.replace(/[^+\d]/g, "")}`} className="block py-1 hover:text-foreground">{settings.brand.supportPhone}</a>
              <a href={`mailto:${settings.brand.supportEmail}`} className="block py-1 hover:text-foreground">{settings.brand.supportEmail}</a>
            </li>
          </FooterCol>
        </nav>
      </div>
      <div className="border-t border-border">
        <div className="container-x flex flex-col items-start justify-between gap-4 py-6 text-[12px] text-muted-foreground md:flex-row md:items-center">
          <p>© {new Date().getFullYear()} {settings.brand.name}. {t.footer.rights}</p>
          <p>{t.footer.payments}</p>
          {socials.length > 0 && (
            <div className="flex gap-2">
              {socials.map(({ href, label, icon: Icon }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="grid h-9 w-9 place-items-center rounded-full border border-border hover:border-foreground hover:text-foreground">
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          )}
        </div>
        {demoData && (
          <p className="bg-warning/10 py-2 text-center text-[11px] font-medium text-warning">
            Development build — catalog, orders and reviews shown are fictional demo data.
          </p>
        )}
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em]">{title}</p>
      <ul className="space-y-2.5">{children}</ul>
    </div>
  );
}
function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="text-sm text-muted-foreground transition hover:text-foreground">{children}</Link>
    </li>
  );
}
