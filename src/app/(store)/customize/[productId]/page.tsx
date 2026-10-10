import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { effectivePrice } from "@/lib/catalog/pricing";
import { getCustomer } from "@/lib/auth/session";
import { SIZE_ORDER } from "@/lib/catalog/sizes";
import { CustomizerStudio } from "@/components/customizer/customizer-studio";
import type { JerseyDesign } from "@/lib/jersey-art";

export const metadata = { title: "Personalise your jersey" };

export default async function CustomizePage({ params, searchParams }: { params: Promise<{ productId: string }>; searchParams: Promise<{ design?: string }> }) {
  const [{ productId }, { design: designId }, user] = await Promise.all([params, searchParams, getCustomer()]);
  const p = await db.product.findFirst({
    where: { id: productId, status: "ACTIVE", customizable: true },
    include: { template: true, images: { take: 1, orderBy: { sortOrder: "asc" } }, variants: { where: { isActive: true }, orderBy: { sortOrder: "asc" } } },
  });
  if (!p || !p.template?.isActive || !p.design) notFound();
  const saved = designId && user ? await db.customDesign.findFirst({ where: { id: designId, userId: user.id, productId } }) : null;
  const t = p.template;
  return (
    <CustomizerStudio
      signedIn={!!user}
      product={{
        id: p.id, slug: p.slug, name: p.name, price: effectivePrice(p).price, design: p.design as unknown as JerseyDesign, modelUrl: t.modelUrl ?? p.model3dUrl,
        allowBaseColor: p.kitType === "CUSTOM",
        colors: [...new Map(p.variants.map((v) => [v.color, v.colorHex])).entries()].map(([name, hex]) => ({ name, hex })),
        variants: p.variants.sort((a, b) => SIZE_ORDER.indexOf(a.size) - SIZE_ORDER.indexOf(b.size)).map((v) => ({ id: v.id, size: v.size, color: v.color, stock: v.stock })),
      }}
      template={{ priceMinor: t.priceMinor, maxNameLength: t.maxNameLength, maxNumberDigits: t.maxNumberDigits, allowedFonts: t.allowedFonts, allowedColors: t.allowedColors, nameArea: t.nameArea as never, numberArea: t.numberArea as never, frontNumberArea: (t.frontNumberArea as never) ?? null }}
      initial={saved ? { name: saved.playerName, number: saved.playerNumber, font: saved.font, textColor: saved.textColor, baseColor: saved.baseColor || null } : null}
    />
  );
}
