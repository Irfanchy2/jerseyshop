/**
 * Money helpers. All amounts are integer minor units (paisa for BDT).
 * 1 BDT = 100 paisa. Never use floating point for stored amounts.
 */

export const CURRENCY = "BDT";

export function toMinor(major: number | string): number {
  const s = typeof major === "number" ? major.toFixed(2) : major.trim();
  if (!/^-?\d+(\.\d{1,2})?$/.test(s)) throw new Error(`Invalid money amount: ${major}`);
  const negative = s.startsWith("-");
  const [whole, frac = ""] = s.replace("-", "").split(".");
  const minor = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  return negative ? -minor : minor;
}

export function toMajorString(minor: number): string {
  const sign = minor < 0 ? "-" : "";
  const abs = Math.abs(Math.trunc(minor));
  const whole = Math.floor(abs / 100);
  const frac = abs % 100;
  return `${sign}${whole}.${String(frac).padStart(2, "0")}`;
}

const bnDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
export function toBnDigits(s: string): string {
  return s.replace(/\d/g, (d) => bnDigits[Number(d)]);
}

/** Format as "৳1,250" (whole taka) or "৳1,250.50" when there are paisa. */
export function formatMoney(minor: number, locale: string = "en"): string {
  const abs = Math.abs(minor);
  const whole = Math.floor(abs / 100);
  const frac = abs % 100;
  // South-Asian digit grouping (12,34,567) is used in Bangladesh.
  const grouped = new Intl.NumberFormat("en-IN").format(whole);
  let out = `৳${grouped}${frac ? "." + String(frac).padStart(2, "0") : ""}`;
  if (minor < 0) out = "-" + out;
  return locale === "bn" ? toBnDigits(out) : out;
}

/** Percentage of an amount, rounded half-up to the nearest paisa, using integer math. */
export function percentOf(minor: number, percent: number): number {
  return Math.floor((minor * percent + 50) / 100);
}

export function sumMinor(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}
