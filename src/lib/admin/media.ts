import "server-only";
import { db } from "@/lib/db";
import { storage, sniffImage } from "@/lib/storage";
import { randomToken } from "@/lib/crypto";
import { slugify } from "@/lib/utils";
import { HttpError } from "@/lib/api";

const MAX_IMAGE = 10 * 1024 * 1024;
const MAX_MODEL = 20 * 1024 * 1024;

/** Validates and stores an uploaded image (re-encoded to strip metadata) or GLB model as public media. */
export async function storeUpload(file: File, folder: string, actorId: string, alt?: string) {
  const buf = Buffer.from(await file.arrayBuffer());
  const base = slugify(file.name.replace(/\.[^.]+$/, "")) || "file";
  if (buf.subarray(0, 4).toString("ascii") === "glTF") {
    if (buf.length > MAX_MODEL) throw new HttpError(413, "3D model is too large (max 20 MB).");
    const key = `public/${folder}/${base}-${randomToken(4)}.glb`;
    await storage().put(key, buf, "model/gltf-binary");
    return db.mediaAsset.create({ data: { key, url: storage().publicUrl(key), mimeType: "model/gltf-binary", sizeBytes: buf.length, folder, uploadedById: actorId, alt } });
  }
  if (buf.length > MAX_IMAGE) throw new HttpError(413, "Image is too large (max 10 MB).");
  const type = sniffImage(buf);
  if (!type) throw new HttpError(415, "Only JPG, PNG, WebP images or GLB models are allowed.");
  const sharp = (await import("sharp")).default;
  const img = sharp(buf).rotate();
  const out = await img.resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true }).webp({ quality: 86 }).toBuffer({ resolveWithObject: true });
  const key = `public/${folder}/${base}-${randomToken(4)}.webp`;
  await storage().put(key, out.data, "image/webp");
  return db.mediaAsset.create({ data: { key, url: storage().publicUrl(key), mimeType: "image/webp", sizeBytes: out.data.length, width: out.info.width, height: out.info.height, folder, uploadedById: actorId, alt } });
}
