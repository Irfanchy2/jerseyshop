export type TryOnInput = { person: { data: Buffer; mime: string }; garment: { data: Buffer; mime: string } };
export type TryOnOutput = { data: Buffer; mime: string; model: string; demo: boolean };

export class TryOnProviderError extends Error {
  constructor(public code: "NOT_CONFIGURED" | "INVALID_INPUT" | "SAFETY_BLOCKED" | "PERMISSION" | "RATE_LIMITED" | "PROVIDER_ERROR" | "TIMEOUT", message: string, public retryable: boolean) {
    super(message);
  }
}

export interface TryOnProvider {
  id: string;
  /** True when this provider can produce real AI try-on images. */
  isReal: boolean;
  generate(input: TryOnInput): Promise<TryOnOutput>;
}

export const CUSTOMER_MESSAGES: Record<string, string> = {
  NOT_CONFIGURED: "Virtual try-on is temporarily unavailable.",
  INVALID_INPUT: "We couldn't use this photo. Try a clear, front-facing photo of one person from the knees up.",
  SAFETY_BLOCKED: "This photo couldn't be processed by our AI provider's safety filters. Please try a different photo.",
  PERMISSION: "Virtual try-on is temporarily unavailable.",
  RATE_LIMITED: "The try-on service is busy. We'll retry automatically — please wait a moment.",
  PROVIDER_ERROR: "The try-on service had a problem. Please try again.",
  TIMEOUT: "The try-on took too long. Please try again.",
  LIMIT_REACHED: "You've reached today's try-on limit. Please come back tomorrow.",
  BUDGET_REACHED: "Virtual try-on is paused for now. Please try again later.",
};
