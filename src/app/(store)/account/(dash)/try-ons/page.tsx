import Link from "next/link";
import { db } from "@/lib/db";
import { requireCustomer } from "@/lib/auth/guards";
import { formatDate } from "@/lib/utils";
import { requestDeletionAction } from "@/lib/account/actions";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Try-on images", robots: { index: false } };

export default async function TryOnsPage() {
  const user = await requireCustomer("/account/try-ons");
  const jobs = await db.tryOnJob.findMany({ where: { userId: user.id, deletedAt: null, status: "SUCCEEDED" }, include: { product: true }, orderBy: { createdAt: "desc" } });
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-xl font-bold">Try-on images</h2>
        {jobs.length > 0 && <form action={requestDeletionAction.bind(null, "tryon_images")}><Button size="sm" variant="outline" type="submit">Delete all my try-on images</Button></form>}
      </div>
      <p className="mb-6 text-sm text-muted-foreground">Images are AI-generated previews. Unsaved images are deleted automatically; saved ones stay until you delete them.</p>
      {jobs.length === 0 ? <p className="text-muted-foreground">No try-on images. <Link href="/try-on" className="underline">Try a jersey on</Link></p> : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map((j) => (
            <li key={j.id} className="overflow-hidden rounded-[var(--radius)] border border-border bg-surface">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {j.resultImageKey && <img src={`/api/try-on/jobs/${j.id}/image?kind=result`} alt="AI try-on preview" className="aspect-[4/5] w-full object-cover" />}
              <div className="p-4 text-sm">
                <p className="font-medium">{j.product.name}</p>
                <p className="text-muted-foreground">{formatDate(j.createdAt)} · {j.isDemo ? "Demo (not AI)" : "AI-generated preview"}{j.saveToAccount ? "" : ` · auto-deletes ${formatDate(j.retainUntil)}`}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
