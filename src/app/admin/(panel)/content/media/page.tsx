import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/auth/guards";
import { storage } from "@/lib/storage";
import { PageHeader, EmptyState } from "@/components/admin/ui";
import { MediaLibrary } from "@/components/admin/media-library";
export const metadata = { title: "Media" };
export default async function Media() {
  await requireStaffPage("content.write");
  const assets = await db.mediaAsset.findMany({ orderBy: { createdAt: "desc" }, take: 300 });
  return (
    <div>
      <PageHeader title="Banners & media" description={`Uploaded images and 3D models · storage: ${storage().kind === "s3" ? "S3-compatible object storage" : "local disk (.storage/)"}`} />
      <MediaLibrary assets={assets.map((a) => ({ id: a.id, url: a.url, mimeType: a.mimeType, sizeBytes: a.sizeBytes, width: a.width, height: a.height, folder: a.folder, createdAt: a.createdAt.toISOString() }))} />
      {assets.length === 0 && <div className="mt-4"><EmptyState title="No media yet" body="Upload hero banners, lifestyle photos, logos or licensed 3D models." /></div>}
    </div>
  );
}
