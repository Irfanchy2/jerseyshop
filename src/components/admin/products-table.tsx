"use client";
import { imgSrc, imgSrcSet } from "@/lib/images";
import * as React from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { setProductStatusAction } from "@/lib/admin/catalog-actions";
import { useAction } from "./use-action";
import { StatusBadge, Table } from "./ui";
import { Button } from "@/components/ui/button";

type Row = { id: string; name: string; slug: string; image: string | null; status: string; category: string; team: string | null; price: string; onSale: boolean; stock: number; variants: number; flags: string[] };

export function ProductsTable({ rows, canWrite }: { rows: Row[]; canWrite: boolean }) {
  const [sel, setSel] = React.useState<Set<string>>(new Set());
  const { run, pending } = useAction(setProductStatusAction);
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  return (
    <div>
      {canWrite && sel.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm">
          <span className="font-medium">{sel.size} selected</span>
          <Button size="sm" variant="outline" loading={pending} onClick={() => run([...sel], "ACTIVE").then(() => setSel(new Set()))}>Publish</Button>
          <Button size="sm" variant="outline" loading={pending} onClick={() => run([...sel], "DRAFT").then(() => setSel(new Set()))}>Set draft</Button>
          <Button size="sm" variant="outline" loading={pending} onClick={() => run([...sel], "ARCHIVED").then(() => setSel(new Set()))}>Archive</Button>
        </div>
      )}
      <Table>
        <thead>
          <tr>
            {canWrite && <th className="w-8"><input type="checkbox" aria-label="Select all" checked={sel.size === rows.length} onChange={(e) => setSel(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())} /></th>}
            <th>Product</th><th>Status</th><th>Category</th><th className="text-right">Price</th><th className="text-right">Stock</th><th>Features</th><th />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              {canWrite && <td><input type="checkbox" aria-label={`Select ${r.name}`} checked={sel.has(r.id)} onChange={() => toggle(r.id)} /></td>}
              <td>
                <Link href={`/admin/products/${r.id}`} className="flex items-center gap-3">
                  <span className="h-12 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {r.image && <img src={imgSrc(r.image, 320)} alt="" className="h-full w-full object-cover" />}
                  </span>
                  <span className="min-w-0"><span className="block truncate font-medium hover:underline">{r.name}</span><span className="text-[12px] text-muted-foreground">{r.team ?? "—"}</span></span>
                </Link>
              </td>
              <td><StatusBadge status={r.status} /></td>
              <td className="text-muted-foreground">{r.category}</td>
              <td className="text-right tabular">{r.price}{r.onSale && <span className="ml-1 text-[11px] text-orange-600">sale</span>}</td>
              <td className={`text-right tabular ${r.stock === 0 ? "text-red-600" : ""}`}>{r.stock} <span className="text-[11px] text-muted-foreground">/ {r.variants} var.</span></td>
              <td><div className="flex flex-wrap gap-1">{r.flags.map((f) => <span key={f} className="rounded bg-muted px-1.5 py-0.5 text-[11px]">{f}</span>)}</div></td>
              <td className="text-right">{r.status === "ACTIVE" && <a href={`/products/${r.slug}`} target="_blank" className="inline-flex text-muted-foreground hover:text-foreground" aria-label="View in store"><ExternalLink className="h-4 w-4" /></a>}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
