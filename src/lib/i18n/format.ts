/** Interpolate "{n}" style placeholders. */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

/** Pick the localised variant of a content field. */
export function pick<T extends string | null | undefined>(locale: string, en: T, bn?: string | null): string {
  return (locale === "bn" && bn ? bn : en) ?? "";
}
