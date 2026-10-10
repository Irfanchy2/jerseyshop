/**
 * Bangladesh mobile numbers: 11 digits starting 01[3-9], optionally prefixed +88 / 88.
 * Normalised form is the 11-digit local format (e.g. 01712345678), which couriers expect.
 */
export function normalizeBdPhone(input: string): string | null {
  const digits = input.replace(/[\s\-()]/g, "").replace(/^\+/, "");
  const local = digits.startsWith("880") ? digits.slice(2) : digits;
  return /^01[3-9]\d{8}$/.test(local) ? local : null;
}

export function isBdPhone(input: string): boolean {
  return normalizeBdPhone(input) !== null;
}

export function maskPhone(phone: string): string {
  return phone.length < 6 ? phone : `${phone.slice(0, 3)}•••••${phone.slice(-3)}`;
}
