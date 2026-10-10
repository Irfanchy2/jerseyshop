import type { Settings } from "@/lib/settings";

const radius = { none: "0px", sm: "0.375rem", md: "0.75rem", lg: "1.25rem", full: "1.5rem" } as const;
const gaps = { compact: "4.5rem", comfortable: "6rem", airy: "8rem" } as const;
const fontVar = { manrope: "var(--font-manrope)", inter: "var(--font-inter)", archivo: "var(--font-archivo)", oswald: "var(--font-oswald)" } as const;

/** Emits the storefront design tokens chosen in Admin → Appearance. Values are schema-validated hex/enums. */
export function ThemeStyle({ appearance }: { appearance: Settings["appearance"] }) {
  const c = appearance.colors;
  const btnRadius = appearance.buttonStyle === "sharp" ? "0px" : appearance.buttonStyle === "outline-pill" ? "999px" : appearance.radius === "none" ? "0px" : "999px";
  const css = `:root{--background:${c.background};--surface:${c.surface};--muted:${c.muted};--foreground:${c.foreground};--muted-foreground:${c.mutedForeground};--border:${c.border};--accent:${c.accent};--accent-foreground:${c.accentForeground};--sale:${c.sale};--radius:${radius[appearance.radius]};--radius-button:${btnRadius};--section-gap:${gaps[appearance.sectionSpacing]};--heading-transform:${appearance.headingCase === "uppercase" ? "uppercase" : "none"};--font-heading-family:${fontVar[appearance.headingFont]};--font-body-family:${fontVar[appearance.bodyFont]};--card-ratio:${appearance.cardImageRatio};}`;
  const card =
    appearance.cardStyle === "framed"
      ? ".pc{border:1px solid var(--border);padding:.5rem;border-radius:calc(var(--radius) + .5rem);background:var(--surface)}"
      : appearance.cardStyle === "elevated"
        ? ".pc{padding:.5rem;border-radius:calc(var(--radius) + .5rem);background:var(--surface);box-shadow:0 10px 30px -14px rgba(0,0,0,.18)}"
        : "";
  return <style dangerouslySetInnerHTML={{ __html: css + card }} />;
}
