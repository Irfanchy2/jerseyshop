import { db } from "@/lib/db";
import { requireCustomer } from "@/lib/auth/guards";
import { requestDeletionAction } from "@/lib/account/actions";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Privacy & data", robots: { index: false } };

export default async function PrivacyPage() {
  const user = await requireCustomer("/account/privacy");
  const requests = await db.dataDeletionRequest.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  return (
    <div className="max-w-2xl space-y-8">
      <h2 className="font-heading text-xl font-bold">Privacy &amp; data</h2>
      <section className="rounded-[var(--radius)] border border-border bg-surface p-5">
        <h3 className="font-semibold">Try-on photos</h3>
        <p className="mt-1 text-sm text-muted-foreground">Delete every photo you uploaded and every try-on image generated for you. This happens immediately.</p>
        <form action={requestDeletionAction.bind(null, "tryon_images")} className="mt-4"><Button variant="outline" type="submit">Delete my try-on images</Button></form>
      </section>
      <section className="rounded-[var(--radius)] border border-border bg-surface p-5">
        <h3 className="font-semibold">Delete my account</h3>
        <p className="mt-1 text-sm text-muted-foreground">We&apos;ll delete your account and personal data within 30 days. Order records required for tax and accounting are kept in anonymised form.</p>
        <form action={requestDeletionAction.bind(null, "account")} className="mt-4"><Button variant="danger" type="submit">Request account deletion</Button></form>
      </section>
      {requests.length > 0 && (
        <section>
          <h3 className="mb-3 font-semibold">Your requests</h3>
          <ul className="space-y-2 text-sm">{requests.map((r) => <li key={r.id} className="flex justify-between rounded-lg bg-muted/60 px-4 py-2"><span>{r.scope === "account" ? "Account deletion" : "Try-on images deletion"}</span><span className="text-muted-foreground">{r.status} · {formatDate(r.createdAt)}</span></li>)}</ul>
        </section>
      )}
    </div>
  );
}
