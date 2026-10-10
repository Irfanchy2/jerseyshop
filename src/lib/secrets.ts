import "server-only";
import { db } from "@/lib/db";
import { decryptJson, encryptJson, last4 } from "@/lib/crypto";

export type SecretKey = "payments.sslcommerz" | "tryon.google";

export async function getSecret<T>(key: SecretKey): Promise<T | null> {
  const row = await db.encryptedSecret.findUnique({ where: { key } });
  if (!row) return null;
  try {
    return decryptJson<T>(row.ciphertext);
  } catch (e) {
    console.error(`Failed to decrypt secret ${key}`, e);
    return null;
  }
}

export async function setSecret(key: SecretKey, value: Record<string, string>, actorId: string, hintFrom?: string) {
  const ciphertext = encryptJson(value);
  const hint = hintFrom ? last4(hintFrom) : null;
  await db.encryptedSecret.upsert({ where: { key }, create: { key, ciphertext, hint, updatedById: actorId }, update: { ciphertext, hint, updatedById: actorId } });
}

export async function secretStatus(key: SecretKey) {
  const row = await db.encryptedSecret.findUnique({ where: { key }, select: { hint: true, updatedAt: true } });
  return row ? { configured: true, hint: row.hint, updatedAt: row.updatedAt } : { configured: false, hint: null, updatedAt: null };
}
