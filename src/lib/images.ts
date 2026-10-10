/**
 * Responsive image helpers. Generated catalog art is authored as SVG but delivered as cached
 * WebP rasters at fixed widths (SVG blur filters are expensive to paint on phones).
 */
export const ART_WIDTHS = [320, 480, 640, 960, 1280] as const;

const isArt = (url: string) => url.startsWith("/art/jersey/") && /\/(front|back)\.svg/.test(url);

export function imgSrc(url: string | null | undefined, width: number, opts: { transparent?: boolean } = {}): string {
  if (!url) return "";
  if (!isArt(url)) return url;
  const w = ART_WIDTHS.find((x) => x >= width) ?? ART_WIDTHS[ART_WIDTHS.length - 1];
  const [path] = url.split("?");
  return `${path.replace(/\.svg$/, ".webp")}?w=${w}${opts.transparent ? "&bg=none" : ""}`;
}

export function imgSrcSet(url: string | null | undefined, opts: { transparent?: boolean } = {}): string | undefined {
  if (!url || !isArt(url)) return undefined;
  return ART_WIDTHS.map((w) => `${imgSrc(url, w, opts)} ${w}w`).join(", ");
}
