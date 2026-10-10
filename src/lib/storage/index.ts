import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Object storage abstraction.
 *  - S3-compatible (AWS S3, Cloudflare R2, DigitalOcean Spaces, MinIO) when S3_BUCKET is set.
 *  - Local private disk (LOCAL_STORAGE_DIR, default .storage/) otherwise — fine for development
 *    and single-server deployments; not shared across instances.
 * Keys under "public/" are publicly readable media; everything else (e.g. "tryon/") is private and
 * only served through access-checked routes or short-lived signed URLs.
 */
export interface Storage {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<{ body: Buffer; contentType: string } | null>;
  delete(key: string): Promise<void>;
  publicUrl(key: string): string;
  kind: "s3" | "local";
}

const safeKey = (key: string) => {
  if (!/^[a-zA-Z0-9/_.-]+$/.test(key) || key.includes("..")) throw new Error("Invalid storage key");
  return key;
};

class LocalStorage implements Storage {
  kind = "local" as const;
  root = path.resolve(process.cwd(), process.env.LOCAL_STORAGE_DIR ?? ".storage");
  async put(key: string, body: Buffer, contentType: string) {
    const file = path.join(this.root, safeKey(key));
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, body);
    await fs.writeFile(`${file}.meta`, JSON.stringify({ contentType }));
  }
  async get(key: string) {
    const file = path.join(this.root, safeKey(key));
    try {
      const [body, meta] = await Promise.all([fs.readFile(file), fs.readFile(`${file}.meta`, "utf8").catch(() => '{"contentType":"application/octet-stream"}')]);
      return { body, contentType: JSON.parse(meta).contentType as string };
    } catch {
      return null;
    }
  }
  async delete(key: string) {
    const file = path.join(this.root, safeKey(key));
    await fs.rm(file, { force: true });
    await fs.rm(`${file}.meta`, { force: true });
  }
  publicUrl(key: string) {
    return `/media/${safeKey(key)}`;
  }
}

class S3Storage implements Storage {
  kind = "s3" as const;
  private client: Promise<import("@aws-sdk/client-s3").S3Client>;
  private bucket = process.env.S3_BUCKET!;
  constructor() {
    this.client = import("@aws-sdk/client-s3").then(
      ({ S3Client }) =>
        new S3Client({
          region: process.env.S3_REGION ?? "auto",
          endpoint: process.env.S3_ENDPOINT || undefined,
          forcePathStyle: !!process.env.S3_ENDPOINT,
          credentials: process.env.S3_ACCESS_KEY_ID ? { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "" } : undefined,
        }),
    );
  }
  async put(key: string, body: Buffer, contentType: string) {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    await (await this.client).send(new PutObjectCommand({ Bucket: this.bucket, Key: safeKey(key), Body: body, ContentType: contentType }));
  }
  async get(key: string) {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    try {
      const r = await (await this.client).send(new GetObjectCommand({ Bucket: this.bucket, Key: safeKey(key) }));
      const bytes = await r.Body!.transformToByteArray();
      return { body: Buffer.from(bytes), contentType: r.ContentType ?? "application/octet-stream" };
    } catch {
      return null;
    }
  }
  async delete(key: string) {
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    await (await this.client).send(new DeleteObjectCommand({ Bucket: this.bucket, Key: safeKey(key) }));
  }
  publicUrl(key: string) {
    const base = process.env.S3_PUBLIC_BASE_URL;
    return base ? `${base.replace(/\/$/, "")}/${safeKey(key)}` : `/media/${safeKey(key)}`;
  }
}

let instance: Storage | null = null;
export function storage(): Storage {
  if (!instance) instance = process.env.S3_BUCKET ? new S3Storage() : new LocalStorage();
  return instance;
}

/** Detect real image type from magic bytes (never trust the client-provided MIME type). */
export function sniffImage(buf: Buffer): "image/jpeg" | "image/png" | "image/webp" | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return null;
}
