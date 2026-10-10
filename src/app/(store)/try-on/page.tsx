import { db } from "@/lib/db";
import { publishedWhere } from "@/lib/catalog/queries";
import { effectivePrice } from "@/lib/catalog/pricing";
import { getSettings } from "@/lib/settings";
import { resolveProvider } from "@/lib/tryon/service";
import { getCustomer } from "@/lib/auth/session";
import { getLocale } from "@/lib/i18n/server";
import { SIZE_ORDER } from "@/lib/catalog/sizes";
import { TryOnStudio } from "@/components/tryon/tryon-studio";

export const metadata = { title: "Virtual Try-On", description: "See an AI-generated preview of you wearing a jersey before you buy." };

export default async function TryOnPage({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  const [{ product }, settings, { provider }, user, locale] = await Promise.all([searchParams, getSettings(), resolveProvider(), getCustomer(), getLocale()]);
  const rows = await db.product.findMany({
    where: { ...publishedWhere(), tryOnEnabled: true },
    include: { images: { take: 1, orderBy: { sortOrder: "asc" } }, variants: { where: { isActive: true }, orderBy: { sortOrder: "asc" } } },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    take: 60,
  });
  const products = rows.map((p) => {
    const firstColor = p.variants[0]?.color;
    return {
      id: p.id, slug: p.slug, name: locale === "bn" && p.nameBn ? p.nameBn : p.name, image: p.images[0]?.url ?? null, price: effectivePrice(p).price, customizable: p.customizable,
      variants: p.variants.filter((v) => v.color === firstColor).sort((a, b) => SIZE_ORDER.indexOf(a.size) - SIZE_ORDER.indexOf(b.size)).map((v) => ({ id: v.id, size: v.size, color: v.color, colorHex: v.colorHex, stock: v.stock })),
    };
  });
  return (
    <TryOnStudio
      products={products}
      initialSlug={product}
      signedIn={!!user}
      status={{ enabled: settings.tryon.enabled, demo: !provider.isReal, maxUploadMb: settings.tryon.maxUploadMb, retentionHours: settings.tryon.retentionHours, sampleModels: settings.tryon.sampleModels.map((m) => ({ id: m.id, label: m.label })) }}
    />
  );
}
