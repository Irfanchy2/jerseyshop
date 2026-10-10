import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { processTryOnJob, purgeExpiredTryOns, resolveProvider, sanitisePersonPhoto } from "@/lib/tryon/service";

async function photo(w = 600, h = 800) {
  const sharp = (await import("sharp")).default;
  return sharp({ create: { width: w, height: h, channels: 3, background: "#c9b8a6" } }).jpeg().withMetadata({ exif: { IFD0: { Copyright: "secret-gps" } } }).toBuffer();
}

describe("virtual try-on", () => {
  it("runs in clearly flagged demo mode when no AI provider is configured", async () => {
    const { provider } = await resolveProvider();
    expect(provider.isReal).toBe(false);
  });

  it("strips metadata and rejects tiny or non-image uploads", async () => {
    const clean = await sanitisePersonPhoto(await photo(), 8);
    const sharp = (await import("sharp")).default;
    expect((await sharp(clean).metadata()).exif).toBeUndefined();
    await expect(sanitisePersonPhoto(await photo(100, 100), 8)).rejects.toThrow(/resolution/);
    await expect(sanitisePersonPhoto(Buffer.from("not an image at all"), 8)).rejects.toThrow(/JPG, PNG or WebP/);
  });

  it("processes a job to a demo result and purges it after retention", async () => {
    const product = await db.product.findFirstOrThrow({ where: { tryOnEnabled: true } });
    const job = await db.tryOnJob.create({
      data: { ownerKeyHash: "test-owner", productId: product.id, provider: "demo", isDemo: true, garmentImageRef: "x", consentAt: new Date(), consentVersion: "test", retainUntil: new Date(Date.now() + 3600_000) },
    });
    const key = `tryon/${job.id}/person.jpg`;
    await storage().put(key, await sanitisePersonPhoto(await photo(), 8), "image/jpeg");
    await db.tryOnJob.update({ where: { id: job.id }, data: { personImageKey: key } });
    await processTryOnJob(job.id);
    const done = await db.tryOnJob.findUniqueOrThrow({ where: { id: job.id } });
    expect(done.status).toBe("SUCCEEDED");
    expect(done.isDemo).toBe(true);
    expect(done.resultImageKey).toBeTruthy();

    await db.tryOnJob.update({ where: { id: job.id }, data: { retainUntil: new Date(Date.now() - 1000) } });
    expect(await purgeExpiredTryOns()).toBeGreaterThanOrEqual(1);
    const purged = await db.tryOnJob.findUniqueOrThrow({ where: { id: job.id } });
    expect(purged.personImageKey).toBeNull();
    expect(purged.resultImageKey).toBeNull();
    expect(await storage().get(key)).toBeNull();
  });
});
