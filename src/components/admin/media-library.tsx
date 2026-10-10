"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Copy, Trash2, Upload, Box } from "lucide-react";
import { deleteMediaAction } from "@/lib/admin/catalog-actions";
import { useUpload } from "./product-form";
import { useAction } from "./use-action";
import { toast } from "@/components/ui/toast";

type Asset = { id: string; url: string; mimeType: string; sizeBytes: number; width: number | null; height: number | null; folder: string; createdAt: string };
export function MediaLibrary({ assets }: { assets: Asset[] }) {
  const router = useRouter();
  const up = useUpload("library");
  const del = useAction(deleteMediaAction);
  return (
    <div>
      <label className="mb-5 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-8 text-center hover:border-foreground/40">
        <Upload className="h-6 w-6" />
        <span className="text-sm font-medium">{up.busy ? "Uploading…" : "Upload images or GLB models"}</span>
        <span className="text-[12px] text-muted-foreground">JPG, PNG, WebP up to 10 MB (re-encoded to WebP, metadata removed) · GLB up to 20 MB</span>
        <input type="file" multiple accept="image/jpeg,image/png,image/webp,.glb" className="sr-only" onChange={async (e) => { for (const f of [...(e.target.files ?? [])]) await up.upload(f); e.target.value = ""; router.refresh(); }} />
      </label>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-6">
        {assets.map((a) => (
          <li key={a.id} className="group overflow-hidden rounded-lg border border-border bg-surface">
            <div className="grid aspect-square place-items-center bg-muted">
              {a.mimeType.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.url} alt="" loading="lazy" className="h-full w-full object-cover" />
              ) : <Box className="h-8 w-8 text-muted-foreground" />}
            </div>
            <div className="flex items-center justify-between gap-1 p-2 text-[11px] text-muted-foreground">
              <span className="truncate">{a.folder} · {Math.round(a.sizeBytes / 1024)} KB{a.width ? ` · ${a.width}×${a.height}` : ""}</span>
              <span className="flex shrink-0">
                <button aria-label="Copy URL" className="rounded p-1 hover:bg-muted" onClick={() => { navigator.clipboard.writeText(a.url); toast({ title: "URL copied" }); }}><Copy className="h-3.5 w-3.5" /></button>
                <button aria-label="Delete" className="rounded p-1 hover:bg-muted hover:text-red-600" onClick={() => confirm("Delete this file? Pages using it will show a broken image.") && del.run(a.id)}><Trash2 className="h-3.5 w-3.5" /></button>
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
