import { db } from "@/lib/db";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { getStaff } from "@/lib/auth/session";
import { SectionsRenderer } from "@/components/store/home/sections-renderer";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
  const [{ preview }, t, locale] = await Promise.all([searchParams, getDictionary(), getLocale()]);
  // Draft preview is only available to signed-in staff.
  const draft = preview === "draft" && !!(await getStaff());
  const rows = await db.homepageSection.findMany({
    where: draft ? { draftEnabled: true } : { isEnabled: true },
    orderBy: draft ? { draftSortOrder: "asc" } : { sortOrder: "asc" },
  });
  const sections = rows
    .map((r) => ({ id: r.id, type: r.type, content: draft ? r.draftContent : r.publishedContent }))
    .filter((s) => s.content != null);
  return (
    <>
      {draft && (
        <div className="sticky top-0 z-50 bg-warning px-4 py-2 text-center text-sm font-semibold text-white">
          Draft preview — these changes are not published yet.
        </div>
      )}
      <SectionsRenderer sections={sections} t={t} locale={locale} />
    </>
  );
}
