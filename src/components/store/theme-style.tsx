import type { Settings } from "@/lib/settings";

const radius = { none: "0px", sm: "0.375rem", md: "0.75rem", lg: "1.25rem", full: "1.5rem" } as const;
const gaps = { compact: "4.5rem", comfortable: "6rem", airy: "8rem" } as const;
const fontVar = { jakarta: "var(--font-jakarta)", manrope: "var(--font-manrope)", inter: "var(--font-inter)", archivo: "var(--font-archivo)", oswald: "var(--font-oswald)" } as const;

function luminance(hex: string) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

/** Darkens the accent until small text in it reaches 4.5:1 on the page background. */
export function accentInk(hex: string, background = "#ffffff") {
  const bg = luminance(background);
  let [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  for (let i = 0; i < 40; i++) {
    const h = `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
    if ((bg + 0.05) / (luminance(h) + 0.05) >= 4.5) return h;
    [r, g, b] = [r, g, b].map((v) => Math.max(0, Math.round(v * 0.94)));
  }
  return "#000000";
}

/** Emits the storefront design tokens chosen in Admin → Appearance. Values are schema-validated hex/enums. */
export function ThemeStyle({ appearance }: { appearance: Settings["appearance"] }) {
  const c = appearance.colors;
  const btnRadius = appearance.buttonStyle === "sharp" ? "0px" : appearance.buttonStyle === "outline-pill" ? "999px" : appearance.radius === "none" ? "0px" : "999px";
  const css = `:root{--background:${c.background};--surface:${c.surface};--muted:${c.muted};--foreground:${c.foreground};--muted-foreground:${c.mutedForeground};--border:${c.border};--accent:${c.accent};--accent-foreground:${c.accentForeground};--accent-ink:${accentInk(c.accent, c.background)};--sale:${c.sale};--radius:${radius[appearance.radius]};--radius-button:${btnRadius};--section-gap:${gaps[appearance.sectionSpacing]};--heading-transform:${appearance.headingCase === "uppercase" ? "uppercase" : "none"};--font-heading-family:${fontVar[appearance.headingFont]};--font-body-family:${fontVar[appearance.bodyFont]};--card-ratio:${appearance.cardImageRatio};}`;
  const card =
    appearance.cardStyle === "framed"
      ? ".pc-frame{box-shadow:inset 0 0 0 1px var(--border)}"
      : appearance.cardStyle === "elevated"
        ? ".pc-frame{box-shadow:0 18px 40px -24px rgba(16,24,40,.28)}"
        : "";
  return <style dangerouslySetInnerHTML={{ __html: css + card }} />;
}
