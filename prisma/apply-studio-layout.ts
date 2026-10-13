/**
 * Opt-in: switches an existing store to the "studio" storefront layout.
 *   npm run db:apply-studio-layout            → replaces homepage sections (draft + published) and the appearance theme
 *   npm run db:apply-studio-layout -- --dry   → prints what would change
 * Merchant edits to the homepage and appearance are overwritten, so this is never run automatically.
 */
import { PrismaClient, Prisma } from "@prisma/client";
import { DEFAULT_SECTIONS } from "../src/lib/cms/sections";
import { DEFAULT_SETTINGS } from "../src/lib/settings";

const db = new PrismaClient();

async function main() {
  const dry = process.argv.includes("--dry");
  const existing = await db.homepageSection.count();
  console.log(`Homepage: ${existing} existing section(s) → ${DEFAULT_SECTIONS.length} studio sections`);
  console.log(`Appearance → preset "${DEFAULT_SETTINGS.appearance.preset}", announcement bar off`);
  if (dry) return;
  await db.$transaction(async (tx) => {
    await tx.homepageSection.deleteMany({});
    let i = 0;
    for (const s of DEFAULT_SECTIONS) {
      await tx.homepageSection.create({
        data: { type: s.type, sortOrder: i, draftSortOrder: i, draftContent: s.content as Prisma.InputJsonValue, publishedContent: s.content as Prisma.InputJsonValue, publishedAt: new Date() },
      });
      i++;
    }
    const appearance = DEFAULT_SETTINGS.appearance as unknown as Prisma.InputJsonValue;
    await tx.siteSetting.upsert({ where: { key: "appearance" }, create: { key: "appearance", value: appearance }, update: { value: appearance, draftValue: Prisma.DbNull } });
    const ann = await tx.siteSetting.findUnique({ where: { key: "announcement" } });
    const current = (ann?.value as Record<string, unknown> | null) ?? (DEFAULT_SETTINGS.announcement as unknown as Record<string, unknown>);
    await tx.siteSetting.upsert({
      where: { key: "announcement" },
      create: { key: "announcement", value: { ...current, enabled: false } as Prisma.InputJsonValue },
      update: { value: { ...current, enabled: false } as Prisma.InputJsonValue },
    });
  });
  console.log("Done.");
}

main().finally(() => db.$disconnect());
