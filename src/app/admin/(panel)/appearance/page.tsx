import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/auth/guards";
import { APPEARANCE_PRESETS, getSetting } from "@/lib/settings";
import { PageHeader } from "@/components/admin/ui";
import { AppearanceEditor } from "@/components/admin/appearance-editor";
export const metadata = { title: "Appearance" };
export default async function Appearance() {
  await requireStaffPage("content.write");
  const [draft, row] = await Promise.all([getSetting("appearance", { draft: true }), db.siteSetting.findUnique({ where: { key: "appearance" } })]);
  return (<div><PageHeader title="Website appearance" description="Brand colours, typography and component styles for the storefront" /><AppearanceEditor draft={draft} presets={APPEARANCE_PRESETS} hasDraft={!!row?.draftValue} /></div>);
}
