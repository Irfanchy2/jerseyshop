import "server-only";
import type { TryOnInput, TryOnOutput, TryOnProvider } from "./types";

/**
 * DEMO provider — used when no AI provider is configured.
 * It does NOT generate a try-on. It returns the customer's photo and the jersey side by side with
 * a clear "DEMO MODE — NOT AN AI TRY-ON" banner, so the full flow (upload, consent, job status,
 * compare, retention) can be tested without ever presenting a fake AI result.
 */
export const demoProvider: TryOnProvider = {
  id: "demo",
  isReal: false,
  async generate(input: TryOnInput): Promise<TryOnOutput> {
    const sharp = (await import("sharp")).default;
    const H = 1024;
    const person = await sharp(input.person.data).resize({ height: H, width: 768, fit: "cover" }).toBuffer();
    const garment = await sharp(input.garment.data).resize({ height: 640, width: 512, fit: "contain", background: "#ffffff" }).toBuffer();
    const banner = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="${H}">
      <rect x="0" y="0" width="1280" height="96" fill="#b45309"/>
      <text x="640" y="60" text-anchor="middle" font-family="Arial, sans-serif" font-size="38" font-weight="700" fill="#fff">DEMO MODE — NOT AN AI TRY-ON</text>
      <text x="1024" y="900" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#555">Configure an AI provider in</text>
      <text x="1024" y="934" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#555">Admin → Virtual Try-On</text>
    </svg>`);
    const data = await sharp({ create: { width: 1280, height: H, channels: 3, background: "#f4f4f2" } })
      .composite([
        { input: person, left: 0, top: 0 },
        { input: garment, left: 768, top: 200 },
        { input: banner, left: 0, top: 0 },
      ])
      .jpeg({ quality: 85 })
      .toBuffer();
    return { data, mime: "image/jpeg", model: "demo", demo: true };
  },
};
