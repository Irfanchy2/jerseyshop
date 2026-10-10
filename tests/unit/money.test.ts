import { describe, expect, it } from "vitest";
import { formatMoney, percentOf, toMajorString, toMinor } from "@/lib/money";

describe("money", () => {
  it("converts to integer minor units without float errors", () => {
    expect(toMinor("19.99")).toBe(1999);
    expect(toMinor(0.1 + 0.2)).toBe(30);
    expect(toMinor("1890")).toBe(189000);
    expect(() => toMinor("1.234")).toThrow();
  });
  it("formats BDT with South-Asian grouping", () => {
    expect(formatMoney(14838100)).toBe("৳1,48,381");
    expect(formatMoney(189050)).toBe("৳1,890.50");
    expect(formatMoney(189000, "bn")).toBe("৳১,৮৯০");
  });
  it("rounds percentages half-up in integer math", () => {
    expect(percentOf(179000, 10)).toBe(17900);
    expect(percentOf(155, 10)).toBe(16);
    expect(toMajorString(-505)).toBe("-5.05");
  });
});
