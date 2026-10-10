import { describe, expect, it } from "vitest";
import { normalizeBdPhone } from "@/lib/phone";
import { effectivePrice } from "@/lib/catalog/pricing";
import { validatePersonalisation } from "@/lib/customizer";
import { parseCsv, csvCell } from "@/lib/admin/csv";
import { mapSteadfastStatus } from "@/lib/couriers/steadfast";
import { mapPathaoStatus } from "@/lib/couriers/pathao";
import { jerseySvg } from "@/lib/jersey-art";
import { encrypt, decrypt } from "@/lib/crypto";

describe("Bangladesh phone numbers", () => {
  it("normalises valid formats", () => {
    expect(normalizeBdPhone("+8801712345678")).toBe("01712345678");
    expect(normalizeBdPhone("01712-345678")).toBe("01712345678");
    expect(normalizeBdPhone("8801812345678")).toBe("01812345678");
  });
  it("rejects invalid numbers", () => {
    expect(normalizeBdPhone("01212345678")).toBeNull();
    expect(normalizeBdPhone("0171234567")).toBeNull();
  });
});

describe("effective price", () => {
  const base = { priceMinor: 190000, compareAtMinor: null, salePriceMinor: 150000, saleStartsAt: null, saleEndsAt: null };
  it("applies an active sale", () => {
    expect(effectivePrice(base)).toMatchObject({ price: 150000, original: 190000, percentOff: 21 });
  });
  it("ignores scheduled sales outside their window", () => {
    const future = { ...base, saleStartsAt: new Date(Date.now() + 86400000) };
    expect(effectivePrice(future)).toMatchObject({ price: 190000, original: null });
    const past = { ...base, saleEndsAt: new Date(Date.now() - 1000) };
    expect(effectivePrice(past).price).toBe(190000);
  });
  it("uses compare-at as the struck-through price", () => {
    expect(effectivePrice({ ...base, salePriceMinor: null, compareAtMinor: 210000 })).toMatchObject({ price: 190000, original: 210000 });
  });
});

describe("personalisation rules", () => {
  const t = { maxNameLength: 12, maxNumberDigits: 2, allowedFonts: ["block"], allowedColors: ["#ffffff"] };
  const ok = { playerName: "RAFI", playerNumber: "10", font: "block", textColor: "#FFFFFF" };
  it("accepts valid designs", () => expect(validatePersonalisation(ok, t, false)).toBeNull());
  it("enforces template limits", () => {
    expect(validatePersonalisation({ ...ok, playerName: "A".repeat(13) }, t, false)).toMatch(/at most 12/);
    expect(validatePersonalisation({ ...ok, playerNumber: "100" }, t, false)).toMatch(/2 digits/);
    expect(validatePersonalisation({ ...ok, font: "comic" }, t, false)).toMatch(/font/);
    expect(validatePersonalisation({ ...ok, textColor: "#ff0000" }, t, false)).toMatch(/colour/);
    expect(validatePersonalisation({ ...ok, playerName: "<script>" }, t, false)).toMatch(/only contain/);
    expect(validatePersonalisation({ ...ok, baseColor: "#000000" }, t, false)).toMatch(/can't be changed/);
  });
  it("allows Bengali names", () => expect(validatePersonalisation({ ...ok, playerName: "রাফি" }, t, false)).toBeNull());
});

describe("CSV", () => {
  it("parses quoted fields and neutralises formulas on export", () => {
    expect(parseCsv('a,b\n"x, y","He said ""hi"""\n')).toEqual([["a", "b"], ["x, y", 'He said "hi"']]);
    expect(csvCell("=HYPERLINK()")).toBe(`"'=HYPERLINK()"`);
  });
});

describe("courier status mapping", () => {
  it("maps Steadfast statuses", () => {
    expect(mapSteadfastStatus("delivered")).toBe("DELIVERED");
    expect(mapSteadfastStatus("partial_delivered_approval_pending")).toBe("PARTIAL_DELIVERED");
    expect(mapSteadfastStatus("something_new")).toBeNull();
  });
  it("maps Pathao events", () => {
    expect(mapPathaoStatus("order.delivered")).toBe("DELIVERED");
    expect(mapPathaoStatus("order.in-transit")).toBe("IN_TRANSIT");
    expect(mapPathaoStatus("order.returned")).toBe("RETURNED");
    expect(mapPathaoStatus("order.unknown-thing")).toBeNull();
  });
});

describe("security helpers", () => {
  it("encrypts secrets with authenticated encryption", () => {
    const c = encrypt("api-key-123");
    expect(c).not.toContain("api-key");
    expect(decrypt(c)).toBe("api-key-123");
    const tampered = c.slice(0, -2) + (c.endsWith("A") ? "BB" : "AA");
    expect(() => decrypt(tampered)).toThrow();
  });
  it("escapes personalisation text in generated SVG", () => {
    const svg = jerseySvg({ pattern: "plain", base: "#111111", secondary: "#ffffff", trim: "#ffffff" }, "back", { name: `<img onerror=x>` });
    expect(svg).not.toContain("<img");
  });
});
