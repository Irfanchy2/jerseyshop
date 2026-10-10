"use client";

import { jerseySvg, readableOn, type JerseyDesign, type JerseyView } from "@/lib/jersey-art";

export const TEX_W = 1024;
export const TEX_H = 1280;

export type Area = { x: number; y: number; w: number; h: number };

export type Personalisation = {
  name?: string;
  number?: string;
  font?: string; // key: block | classic | modern
  textColor?: string;
  nameArea?: Area;
  numberArea?: Area;
  frontNumberArea?: Area | null;
};

export const FONT_KEYS: Record<string, { label: string; cssVar: string; weight: number; fallback: string }> = {
  block: { label: "Block", cssVar: "--font-oswald", weight: 700, fallback: "Impact, 'Arial Narrow', sans-serif" },
  classic: { label: "Classic", cssVar: "--font-archivo", weight: 800, fallback: "Georgia, serif" },
  modern: { label: "Modern", cssVar: "--font-manrope", weight: 800, fallback: "Arial, sans-serif" },
};

/** Resolve the actual (hashed) font-family registered by next/font for a key. */
export function fontFamily(key = "block") {
  const f = FONT_KEYS[key] ?? FONT_KEYS.block;
  const fam = typeof window !== "undefined" ? getComputedStyle(document.documentElement).getPropertyValue(f.cssVar).trim() : "";
  return { family: `${fam ? fam + ", " : ""}${f.fallback}`, weight: f.weight };
}

function loadSvg(svg: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

function fitText(ctx: CanvasRenderingContext2D, text: string, family: string, weight: number, maxW: number, maxH: number) {
  let size = maxH;
  ctx.font = `${weight} ${size}px ${family}`;
  while (ctx.measureText(text).width > maxW && size > 8) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

/**
 * Draws a jersey panel (front/back) onto a transparent canvas, then prints the personalisation
 * with real webfonts (SVG-in-image cannot use document fonts, so text is drawn with Canvas 2D).
 */
export async function drawJerseyCanvas(design: JerseyDesign, view: JerseyView, p: Personalisation = {}, canvas?: HTMLCanvasElement) {
  const c = canvas ?? document.createElement("canvas");
  c.width = TEX_W;
  c.height = TEX_H;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, TEX_W, TEX_H);
  const img = await loadSvg(jerseySvg(design, view, { backdrop: null, width: TEX_W }));
  ctx.drawImage(img, 0, 0, TEX_W, TEX_H);
  await document.fonts?.ready;

  const color = p.textColor && /^#[0-9a-f]{6}$/i.test(p.textColor) ? p.textColor : readableOn(design.base);
  const { family, weight } = fontFamily(p.font);
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // Subtle print shading so the vinyl reads as applied to fabric.
  ctx.shadowColor = "rgba(0,0,0,0.18)";
  ctx.shadowBlur = 2;
  ctx.shadowOffsetY = 1;

  if (view === "back") {
    if (p.name && p.nameArea) {
      const a = p.nameArea;
      const text = p.name.toUpperCase();
      ctx.save();
      const size = fitText(ctx, text, family, weight, a.w * TEX_W, a.h * TEX_H);
      ctx.font = `${weight} ${size}px ${family}`;
      (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${Math.round(size * 0.08)}px`;
      ctx.fillText(text, (a.x + a.w / 2) * TEX_W, (a.y + a.h / 2) * TEX_H);
      ctx.restore();
    }
    if (p.number && p.numberArea) {
      const a = p.numberArea;
      const size = fitText(ctx, p.number, family, weight, a.w * TEX_W, a.h * TEX_H * 1.05);
      ctx.font = `${weight} ${size}px ${family}`;
      ctx.fillText(p.number, (a.x + a.w / 2) * TEX_W, (a.y + a.h / 2) * TEX_H);
    }
  } else if (p.number && p.frontNumberArea) {
    const a = p.frontNumberArea;
    const size = fitText(ctx, p.number, family, weight, a.w * TEX_W, a.h * TEX_H);
    ctx.font = `${weight} ${size}px ${family}`;
    ctx.fillText(p.number, (a.x + a.w / 2) * TEX_W, (a.y + a.h / 2) * TEX_H);
  }
  return c;
}

/** Row-wise horizontal extents of the opaque silhouette, used to build a closed 3D garment. */
export function silhouetteExtents(canvas: HTMLCanvasElement, rows: number) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const out: { l: number; r: number }[] = [];
  for (let i = 0; i <= rows; i++) {
    const y = Math.min(canvas.height - 1, Math.round((i / rows) * (canvas.height - 1)));
    let l = -1;
    let r = -1;
    for (let x = 0; x < canvas.width; x += 2) {
      if (data[(y * canvas.width + x) * 4 + 3] > 40) {
        if (l < 0) l = x;
        r = x;
      }
    }
    out.push(l < 0 ? { l: 0.5, r: 0.5 } : { l: l / canvas.width, r: r / canvas.width });
  }
  return out;
}

/** Procedural knit normal map (tileable) for a fabric look without downloading textures. */
export function fabricNormalCanvas(size = 128) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "rgb(128,128,255)";
  ctx.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y += 4) {
    for (let x = 0; x < size; x += 4) {
      const offset = (y / 4) % 2 ? 2 : 0;
      ctx.fillStyle = "rgb(150,140,255)";
      ctx.fillRect(x + offset, y, 2, 2);
      ctx.fillStyle = "rgb(106,116,255)";
      ctx.fillRect(x + offset + 1, y + 2, 2, 1);
    }
  }
  return c;
}

export function supportsWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch {
    return false;
  }
}
