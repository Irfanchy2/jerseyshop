"use client";
export function PrintButton() {
  return <button onClick={() => window.print()} className="mt-8 rounded-lg border border-black px-4 py-2 text-sm print:hidden">Print</button>;
}
