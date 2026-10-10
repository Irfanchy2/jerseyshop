"use client";
import { Ruler } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

const ROWS = [
  ["S", "91–96", "70", "44"],
  ["M", "97–102", "72", "46"],
  ["L", "103–108", "74", "48"],
  ["XL", "109–114", "76", "50"],
  ["XXL", "115–120", "78", "52"],
];

export function SizeGuide({ label }: { label: string }) {
  return (
    <Dialog>
      <DialogTrigger className="inline-flex items-center gap-1.5 text-[13px] font-medium underline underline-offset-4">
        <Ruler className="h-3.5 w-3.5" /> {label}
      </DialogTrigger>
      <DialogContent title={label} description="Body measurements in centimetres. Between sizes? Size up for a relaxed fit.">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 font-medium">Size</th><th className="py-2 font-medium">Chest</th><th className="py-2 font-medium">Length</th><th className="py-2 font-medium">Shoulder</th>
            </tr>
          </thead>
          <tbody className="tabular">
            {ROWS.map((r) => (
              <tr key={r[0]} className="border-b border-border last:border-0">
                {r.map((c, i) => <td key={i} className={i === 0 ? "py-2.5 font-semibold" : "py-2.5"}>{c}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-4 text-[13px] text-muted-foreground">How to measure: chest around the fullest part, length from the high point of the shoulder to the hem.</p>
      </DialogContent>
    </Dialog>
  );
}
