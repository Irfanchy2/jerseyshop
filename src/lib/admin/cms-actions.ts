"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { sectionSchemas, DEFAULT_SECTIONS, type SectionType } from "@/lib/cms/sections";
import { staffAction, fail, type ActionResult } from "./guard";

const draftSchema = z.array(z.object({ id: z.string(), enabled: z.boolean(), content: z.unknown() }));

/** Save the full draft layout (order, visibility, content). Nothing changes on the live site until publish. */
export async function saveHomepageDraftAction(sections: z.infer<typeof draftSchema>): Promise<ActionResult> {
  try {
    const staff = await staffAction("content.write");
    const list = draftSchema.parse(sections);
    const rows = await db.homepageSection.findMany({ where: { id: { in: list.map((s) => s.id) } } });
    for (const s of list) {
      const row = rows.find((r) => r.id === s.id);
      if (!row) continue;
      const schema = sectionSchemas[row.type as SectionType];
      const parsed = schema.safeParse(s.content);
      if (!parsed.success) return { ok: false, error: `${row.type}: ${parsed.error.issues[0]?.path.join(".")} — ${parsed.error.issues[0]?.message}` };
    }
    await db.$transaction(list.map((s, i) => db.homepageSection.update({ where: { id: s.id }, data: { draftEnabled: s.enabled, draftSortOrder: i, draftContent: s.content as Prisma.InputJsonValue } })));
    await audit({ actorId: staff.id, action: "homepage.draft", entityType: "homepage" });
    return { ok: true, message: "Draft saved. Preview it, then publish when ready." };
  } catch (e) {
    return fail(e);
  }
}

export async function publishHomepageAction(): Promise<ActionResult> {
  try {
    const staff = await staffAction("content.write");
    const rows = await db.homepageSection.findMany();
    await db.$transaction(rows.map((r) => db.homepageSection.update({ where: { id: r.id }, data: { publishedContent: r.draftContent as Prisma.InputJsonValue, isEnabled: r.draftEnabled, sortOrder: r.draftSortOrder, publishedAt: new Date() } })));
    await audit({ actorId: staff.id, action: "homepage.publish", entityType: "homepage" });
    revalidatePath("/");
    return { ok: true, message: "Homepage published." };
  } catch (e) {
    return fail(e);
  }
}

export async function addHomepageSectionAction(type: SectionType): Promise<ActionResult> {
  try {
    const staff = await staffAction("content.write");
    const template = DEFAULT_SECTIONS.find((s) => s.type === type)?.content ?? defaultContent(type);
    const max = await db.homepageSection.aggregate({ _max: { draftSortOrder: true } });
    const s = await db.homepageSection.create({ data: { type, draftContent: template as Prisma.InputJsonValue, draftEnabled: true, isEnabled: false, sortOrder: 999, draftSortOrder: (max._max.draftSortOrder ?? 0) + 1 } });
    await audit({ actorId: staff.id, action: "homepage.add_section", entityType: "homepage", entityId: s.id, summary: type });
    revalidatePath("/admin/content/homepage");
    return { ok: true, message: "Section added to the draft.", id: s.id };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteHomepageSectionAction(id: string): Promise<ActionResult> {
  try {
    const staff = await staffAction("content.write");
    await db.homepageSection.delete({ where: { id } });
    await audit({ actorId: staff.id, action: "homepage.delete_section", entityType: "homepage", entityId: id });
    revalidatePath("/admin/content/homepage");
    revalidatePath("/");
    return { ok: true, message: "Section removed." };
  } catch (e) {
    return fail(e);
  }
}

function defaultContent(type: SectionType): unknown {
  if (type === "editorial_banner")
    return { eyebrow: "Limited drop", eyebrowBn: "", headline: "New kit, new season.", headlineBn: "", body: "Describe your promotion here.", bodyBn: "", ctaLabel: "Shop now", ctaLabelBn: "", ctaHref: "/shop", imageUrl: null, productSlug: null, bgColor: "#e9e7ef" };
  return {};
}
