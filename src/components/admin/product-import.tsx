"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";

type Result = { ok: boolean; dryRun?: boolean; rows?: number; valid?: number; errors?: { line: number; error: string }[]; created?: number; updated?: number; error?: string };
export function ProductImport() {
  const [text, setText] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [res, setRes] = React.useState<Result | null>(null);
  const [busy, setBusy] = React.useState(false);
  const send = async (dry: boolean) => {
    if (!text) return;
    setBusy(true);
    const r = await fetch(`/api/admin/products/import${dry ? "?dryRun=1" : ""}`, { method: "POST", body: text, headers: { "Content-Type": "text/csv" } });
    setRes(await r.json());
    setBusy(false);
  };
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Start from <a className="underline" href="/api/admin/products/export">the export file</a>. Columns: sku, product_slug, product_name, category_slug, team_slug, season, kit_type, status, price, compare_at, size, color, color_hex, stock, variant_price, description, tags (pipe-separated).</p>
      <input type="file" accept=".csv,text/csv" aria-label="CSV file" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { setName(f.name); setText(await f.text()); setRes(null); } }} />
      {text && <p className="text-sm">{name} · {text.split("\n").length - 1} rows</p>}
      <div className="flex gap-2"><Button variant="outline" disabled={!text} loading={busy} onClick={() => send(true)}>Validate (dry run)</Button><Button disabled={!text || !res?.ok || !res.dryRun} loading={busy} onClick={() => send(false)}>Import</Button></div>
      {res && (
        <div className={`rounded-lg p-4 text-sm ${res.ok ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
          {res.error ? res.error : res.dryRun ? `${res.valid} of ${res.rows} rows valid.${res.ok ? " Ready to import." : ""}` : `Imported: ${res.created} variants created, ${res.updated} updated.`}
          {res.errors && res.errors.length > 0 && <ul className="mt-2 list-disc pl-5">{res.errors.map((e) => <li key={e.line}>Line {e.line}: {e.error}</li>)}</ul>}
        </div>
      )}
    </div>
  );
}
