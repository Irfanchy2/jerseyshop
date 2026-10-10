import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/auth/guards";
import { getSettings } from "@/lib/settings";
import type { SectionType } from "@/lib/cms/sections";
import { Card, PageHeader } from "@/components/admin/ui";
import { AnnouncementEditor, FooterBrandEditor, HomepageEditor } from "@/components/admin/homepage-editor";
export const metadata = { title: "Homepage editor" };
export default async function HomepageEditorPage() {
  await requireStaffPage("content.write");
  const [rows, settings, products, collections] = await Promise.all([
    db.homepageSection.findMany({ orderBy: { draftSortOrder: "asc" } }),
    getSettings(),
    db.product.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" }, select: { slug: true, name: true } }),
    db.collection.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { slug: true, name: true } }),
  ]);
  const dirty = rows.some((r) => JSON.stringify(r.draftContent) !== JSON.stringify(r.publishedContent) || r.draftEnabled !== r.isEnabled || r.draftSortOrder !== r.sortOrder);
  return (
    <div className="space-y-6">
      <PageHeader title="Homepage editor" description="Edit sections, reorder them, preview the draft and publish when ready." />
      <HomepageEditor key={rows.map((r) => `${r.id}:${r.updatedAt.getTime()}`).join("|")} dirtyFromPublished={dirty} products={products} collections={collections} initial={rows.map((r) => ({ id: r.id, type: r.type as SectionType, enabled: r.draftEnabled, content: r.draftContent as Record<string, unknown>, published: r.publishedContent != null }))} />
      <Card title="Announcement bar" description="Rotating messages above the header (published immediately)."><AnnouncementEditor value={settings.announcement} /></Card>
      <Card title="Brand, footer & social links"><FooterBrandEditor footer={settings.footer} brand={settings.brand} /></Card>
    </div>
  );
}
