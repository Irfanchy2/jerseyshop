import "server-only";
import { createSign } from "node:crypto";
import { TryOnProviderError, type TryOnInput, type TryOnOutput, type TryOnProvider } from "./types";

/**
 * Google Cloud Vertex AI — Virtual Try-On (Imagen) adapter.
 * REST: POST https://{LOCATION}-aiplatform.googleapis.com/v1/projects/{PROJECT}/locations/{LOCATION}/publishers/google/models/{MODEL}:predict
 * Body: { instances: [{ personImage: { image: { bytesBase64Encoded } }, productImages: [{ image: { bytesBase64Encoded } }] }], parameters: { sampleCount } }
 * Auth: OAuth2 access token from a service account (JWT bearer grant), created server-side only.
 * Reference: https://cloud.google.com/vertex-ai/generative-ai/docs/image/generate-virtual-try-on-images
 * NOTE: not exercised against the live API in this repository (no credentials available) — verify in staging.
 */
type ServiceAccount = { client_email: string; private_key: string; project_id?: string };

let tokenCache: { token: string; exp: number; email: string } | null = null;

async function accessToken(sa: ServiceAccount): Promise<string> {
  if (tokenCache && tokenCache.email === sa.client_email && tokenCache.exp > Date.now() + 60_000) return tokenCache.token;
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/cloud-platform", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 })}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(sa.private_key).toString("base64url");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${signature}` }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new TryOnProviderError("PERMISSION", `Google auth failed (${res.status})`, false);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = { token: data.access_token, exp: Date.now() + data.expires_in * 1000, email: sa.client_email };
  return data.access_token;
}

export function googleVertexProvider(cfg: { serviceAccount: ServiceAccount; project: string; location: string; model: string }): TryOnProvider {
  return {
    id: "google-vertex",
    isReal: true,
    async generate(input: TryOnInput): Promise<TryOnOutput> {
      const token = await accessToken(cfg.serviceAccount);
      const url = `https://${cfg.location}-aiplatform.googleapis.com/v1/projects/${cfg.project}/locations/${cfg.location}/publishers/google/models/${cfg.model}:predict`;
      let res: Response;
      try {
        res = await fetch(url, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            instances: [
              {
                personImage: { image: { bytesBase64Encoded: input.person.data.toString("base64") } },
                productImages: [{ image: { bytesBase64Encoded: input.garment.data.toString("base64") } }],
              },
            ],
            parameters: { sampleCount: 1, addWatermark: true, personGeneration: "allow_adult" },
          }),
          signal: AbortSignal.timeout(120_000),
        });
      } catch (e) {
        throw new TryOnProviderError("TIMEOUT", `Vertex request failed: ${(e as Error).message}`, true);
      }
      const body = (await res.json().catch(() => ({}))) as { predictions?: { bytesBase64Encoded?: string; mimeType?: string; raiFilteredReason?: string }[]; error?: { message?: string } };
      if (res.status === 400) throw new TryOnProviderError("INVALID_INPUT", body.error?.message ?? "Invalid request", false);
      if (res.status === 401 || res.status === 403) throw new TryOnProviderError("PERMISSION", body.error?.message ?? "Permission denied", false);
      if (res.status === 429) throw new TryOnProviderError("RATE_LIMITED", "Quota exceeded", true);
      if (!res.ok) throw new TryOnProviderError("PROVIDER_ERROR", body.error?.message ?? `HTTP ${res.status}`, true);
      const pred = body.predictions?.find((p) => p.bytesBase64Encoded);
      if (!pred?.bytesBase64Encoded) throw new TryOnProviderError("SAFETY_BLOCKED", body.predictions?.[0]?.raiFilteredReason ?? "No image returned (filtered)", false);
      return { data: Buffer.from(pred.bytesBase64Encoded, "base64"), mime: pred.mimeType ?? "image/png", model: cfg.model, demo: false };
    },
  };
}
