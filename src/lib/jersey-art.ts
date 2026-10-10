/**
 * Original, procedurally drawn jersey illustrations used as catalog art.
 * No third-party club crests, sponsor marks or photography are used.
 * Isomorphic: used by the /art route handler and by the 2D customiser fallback.
 */

export type JerseyPattern =
  | "plain"
  | "stripes"
  | "pinstripe"
  | "hoops"
  | "halves"
  | "sash"
  | "chevron"
  | "gradient"
  | "band"
  | "quarters";

export type JerseyDesign = {
  pattern: JerseyPattern;
  base: string;
  secondary: string;
  trim: string;
  collar?: "crew" | "v" | "polo";
  sleeveColor?: string;
  crest?: { shape: "shield" | "circle" | "diamond"; initials: string; color?: string };
  longSleeve?: boolean;
};

export type JerseyView = "front" | "back";

export type JerseyArtOptions = {
  backdrop?: string | null; // null = transparent
  name?: string;
  number?: string;
  textColor?: string;
  font?: string; // css font-family
  width?: number;
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function isHex(s: string | undefined): s is string {
  return !!s && /^#[0-9a-fA-F]{6}$/.test(s);
}

function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function readableOn(hex: string) {
  return luminance(hex) > 0.45 ? "#111111" : "#ffffff";
}

// Silhouette geometry on an 800×1000 canvas.
function bodyPath(view: JerseyView, longSleeve = false) {
  const neckDip = view === "front" ? 222 : 182;
  const armpitY = longSleeve ? 420 : 386;
  const sleeveL = longSleeve ? "L 92 300 L 70 700 L 150 712 L 236 420" : "L 92 300 L 152 430 L 238 386";
  const sleeveR = longSleeve ? "L 650 712 L 730 700 L 708 300" : "L 648 430 L 708 300";
  return [
    "M 330 152",
    "C 298 162 252 170 214 184",
    sleeveL,
    "C 244 470 252 560 250 640",
    "L 246 884",
    "Q 400 906 554 884",
    "L 550 640",
    `C 548 560 556 470 ${longSleeve ? 564 : 562} ${armpitY}`,
    sleeveR,
    "L 586 184",
    "C 548 170 502 162 470 152",
    `Q 400 ${neckDip} 330 152`,
    "Z",
  ].join(" ");
}

function patternLayer(d: JerseyDesign, view: JerseyView): string {
  const s = d.secondary;
  switch (d.pattern) {
    case "stripes": {
      let out = "";
      for (let x = 100; x < 720; x += 96) out += `<rect x="${x}" y="100" width="48" height="840" fill="${s}"/>`;
      return out;
    }
    case "pinstripe": {
      let out = "";
      for (let x = 92; x < 720; x += 34) out += `<rect x="${x}" y="100" width="5" height="840" fill="${s}" opacity="0.85"/>`;
      return out;
    }
    case "hoops": {
      let out = "";
      for (let y = 250; y < 940; y += 110) out += `<rect x="40" y="${y}" width="720" height="55" fill="${s}"/>`;
      return out;
    }
    case "halves":
      return `<rect x="400" y="100" width="400" height="840" fill="${s}"/>`;
    case "quarters":
      return `<rect x="400" y="100" width="400" height="420" fill="${s}"/><rect x="0" y="520" width="400" height="420" fill="${s}"/>`;
    case "sash":
      return view === "front"
        ? `<polygon points="190,150 300,150 640,940 520,940" fill="${s}"/>`
        : `<polygon points="500,150 610,150 280,940 160,940" fill="${s}"/>`;
    case "chevron":
      return view === "front"
        ? `<polygon points="60,250 400,470 740,250 740,340 400,560 60,340" fill="${s}"/>`
        : "";
    case "band":
      return `<rect x="40" y="330" width="720" height="120" fill="${s}"/>`;
    case "gradient":
      return "";
    default:
      return "";
  }
}

function crestSvg(d: JerseyDesign): string {
  if (!d.crest) return "";
  const c = d.crest.color && isHex(d.crest.color) ? d.crest.color : d.trim;
  const fg = readableOn(c);
  const initials = esc(d.crest.initials.slice(0, 3).toUpperCase());
  const cx = 488;
  const cy = 300;
  let shape = "";
  if (d.crest.shape === "circle") shape = `<circle cx="${cx}" cy="${cy}" r="30" fill="${c}" stroke="${fg}" stroke-opacity=".35" stroke-width="2"/>`;
  else if (d.crest.shape === "diamond")
    shape = `<polygon points="${cx},${cy - 36} ${cx + 30},${cy} ${cx},${cy + 36} ${cx - 30},${cy}" fill="${c}" stroke="${fg}" stroke-opacity=".35" stroke-width="2"/>`;
  else
    shape = `<path d="M ${cx - 27} ${cy - 30} H ${cx + 27} V ${cy + 2} Q ${cx + 27} ${cy + 26} ${cx} ${cy + 38} Q ${cx - 27} ${cy + 26} ${cx - 27} ${cy + 2} Z" fill="${c}" stroke="${fg}" stroke-opacity=".35" stroke-width="2"/>`;
  return `${shape}<text x="${cx}" y="${cy + 7}" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-weight="800" font-size="${initials.length > 2 ? 15 : 19}" fill="${fg}" letter-spacing="0.5">${initials}</text>`;
}

/** Studio brand mark (original): a small double-chevron on the wearer's right chest. */
function brandMark(color: string) {
  return `<g transform="translate(296 286)" fill="${color}" opacity="0.92"><path d="M0 0 L14 0 L24 14 L34 0 L48 0 L24 30 Z"/><path d="M8 -12 L18 -12 L24 -4 L30 -12 L40 -12 L24 8 Z" opacity=".6"/></g>`;
}

export function jerseySvg(design: JerseyDesign, view: JerseyView = "front", opts: JerseyArtOptions = {}): string {
  const d: JerseyDesign = {
    ...design,
    base: isHex(design.base) ? design.base : "#1f2937",
    secondary: isHex(design.secondary) ? design.secondary : "#ffffff",
    trim: isHex(design.trim) ? design.trim : "#ffffff",
  };
  const sleeve = isHex(d.sleeveColor) ? d.sleeveColor : null;
  const path = bodyPath(view, d.longSleeve);
  const backdrop = opts.backdrop === undefined ? "#efece6" : opts.backdrop;
  const textColor = opts.textColor && isHex(opts.textColor) ? opts.textColor : readableOn(d.base);
  const font = opts.font ?? "Oswald, 'Arial Narrow', Impact, sans-serif";
  const uid = Math.abs(hashCode(JSON.stringify(d) + view)).toString(36);
  const width = opts.width ?? 800;

  const baseFill = d.pattern === "gradient" ? `url(#grad-${uid})` : d.base;
  const neckTrim =
    view === "front"
      ? d.collar === "v"
        ? `<path d="M 330 152 L 400 238 L 470 152" fill="none" stroke="${d.trim}" stroke-width="14" stroke-linejoin="round"/>`
        : d.collar === "polo"
          ? `<path d="M 330 152 Q 400 222 470 152" fill="none" stroke="${d.trim}" stroke-width="12"/><path d="M 338 150 L 384 214 L 400 186 L 416 214 L 462 150 Z" fill="${d.trim}"/><line x1="400" y1="186" x2="400" y2="246" stroke="${d.trim}" stroke-width="5"/>`
          : `<path d="M 330 152 Q 400 222 470 152" fill="none" stroke="${d.trim}" stroke-width="14" stroke-linecap="round"/>`
      : `<path d="M 330 152 Q 400 182 470 152" fill="none" stroke="${d.trim}" stroke-width="12" stroke-linecap="round"/><rect x="378" y="176" width="44" height="16" rx="3" fill="${d.trim}" opacity=".85"/>`;

  const cuffs = d.longSleeve
    ? `<path d="M 70 700 L 150 712" stroke="${d.trim}" stroke-width="14"/><path d="M 650 712 L 730 700" stroke="${d.trim}" stroke-width="14"/>`
    : `<path d="M 152 430 L 238 386" stroke="${d.trim}" stroke-width="12" stroke-linecap="round"/><path d="M 562 386 L 648 430" stroke="${d.trim}" stroke-width="12" stroke-linecap="round"/>`;

  const sleeveOverlay = sleeve
    ? d.longSleeve
      ? `<path d="M 214 184 L 92 300 L 70 700 L 150 712 L 236 420 C 240 330 236 250 214 184 Z" fill="${sleeve}"/><path d="M 586 184 L 708 300 L 730 700 L 650 712 L 564 420 C 560 330 564 250 586 184 Z" fill="${sleeve}"/>`
      : `<path d="M 214 184 L 92 300 L 152 430 L 238 386 C 236 300 232 240 214 184 Z" fill="${sleeve}"/><path d="M 586 184 L 708 300 L 648 430 L 562 386 C 564 300 568 240 586 184 Z" fill="${sleeve}"/>`
    : "";

  const name = opts.name ? esc(opts.name.toUpperCase().slice(0, 14)) : "";
  const number = opts.number ? esc(opts.number.slice(0, 2)) : "";
  const personalisation =
    view === "back" && (name || number)
      ? `${name ? `<text x="400" y="330" text-anchor="middle" font-family="${font}" font-weight="700" font-size="${name.length > 10 ? 46 : 56}" letter-spacing="4" fill="${textColor}">${name}</text>` : ""}
         ${number ? `<text x="400" y="640" text-anchor="middle" font-family="${font}" font-weight="700" font-size="300" fill="${textColor}">${number}</text>` : ""}`
      : view === "front" && number
        ? `<text x="400" y="430" text-anchor="middle" font-family="${font}" font-weight="700" font-size="90" fill="${textColor}">${number}</text>`
        : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="${width}" height="${Math.round(width * 1.25)}" role="img" aria-label="${view} view of jersey">
<defs>
  <clipPath id="clip-${uid}"><path d="${path}"/></clipPath>
  <linearGradient id="grad-${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${d.base}"/><stop offset="1" stop-color="${d.secondary}"/></linearGradient>
  <linearGradient id="shade-${uid}" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#000" stop-opacity=".30"/><stop offset=".22" stop-color="#000" stop-opacity=".06"/>
    <stop offset=".46" stop-color="#fff" stop-opacity=".10"/><stop offset=".62" stop-color="#fff" stop-opacity=".04"/>
    <stop offset=".82" stop-color="#000" stop-opacity=".08"/><stop offset="1" stop-color="#000" stop-opacity=".32"/>
  </linearGradient>
  <linearGradient id="vshade-${uid}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#fff" stop-opacity=".08"/><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".16"/>
  </linearGradient>
  <radialGradient id="bg-${uid}" cx=".5" cy=".42" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <pattern id="mesh-${uid}" width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="#000" opacity=".07"/><circle cx="6" cy="6" r="1" fill="#fff" opacity=".06"/></pattern>
  <filter id="soft-${uid}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="14"/></filter>
  <filter id="drop-${uid}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="18"/></filter>
</defs>
${backdrop ? `<rect width="800" height="1000" fill="${backdrop}"/><rect width="800" height="1000" fill="url(#bg-${uid})"/>` : ""}
<ellipse cx="400" cy="930" rx="230" ry="22" fill="#000" opacity=".16" filter="url(#drop-${uid})"/>
<g clip-path="url(#clip-${uid})">
  <rect x="0" y="0" width="800" height="1000" fill="${baseFill}"/>
  ${patternLayer(d, view)}
  ${sleeveOverlay}
  <rect x="0" y="0" width="800" height="1000" fill="url(#mesh-${uid})"/>
  <rect x="0" y="0" width="800" height="1000" fill="url(#shade-${uid})"/>
  <rect x="0" y="0" width="800" height="1000" fill="url(#vshade-${uid})"/>
  <g filter="url(#soft-${uid})" opacity=".55">
    <path d="M 300 420 C 330 520 320 640 300 780" stroke="#000" stroke-opacity=".22" stroke-width="22" fill="none"/>
    <path d="M 500 460 C 480 560 492 680 512 800" stroke="#000" stroke-opacity=".16" stroke-width="18" fill="none"/>
    <path d="M 380 300 C 420 420 430 520 410 640" stroke="#fff" stroke-opacity=".18" stroke-width="30" fill="none"/>
    <path d="M 238 386 C 250 400 262 420 270 450" stroke="#000" stroke-opacity=".35" stroke-width="16" fill="none"/>
    <path d="M 562 386 C 550 400 538 420 530 450" stroke="#000" stroke-opacity=".35" stroke-width="16" fill="none"/>
  </g>
  <path d="M 214 184 C 236 250 240 320 238 386" stroke="#000" stroke-opacity=".18" stroke-width="3" fill="none"/>
  <path d="M 586 184 C 564 250 560 320 562 386" stroke="#000" stroke-opacity=".18" stroke-width="3" fill="none"/>
  <path d="M 246 878 Q 400 900 554 878" stroke="#000" stroke-opacity=".18" stroke-width="4" fill="none"/>
</g>
${cuffs}
${neckTrim}
${view === "front" ? brandMark(d.trim) + crestSvg(d) : ""}
${personalisation}
</svg>`;
}

function hashCode(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}
