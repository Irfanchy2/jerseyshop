import "server-only";
import { cache } from "react";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a 6-digit hex colour");

export const settingSchemas = {
  brand: z.object({
    name: z.string().min(1).max(40),
    tagline: z.string().max(120),
    logoUrl: z.string().max(500).nullable(),
    supportPhone: z.string().max(30),
    supportEmail: z.string().email(),
    address: z.string().max(200),
  }),
  appearance: z.object({
    preset: z.string(),
    colors: z.object({
      background: hex,
      surface: hex,
      muted: hex,
      foreground: hex,
      mutedForeground: hex,
      border: hex,
      accent: hex,
      accentForeground: hex,
      sale: hex,
    }),
    headingFont: z.enum(["manrope", "inter", "archivo", "oswald"]),
    bodyFont: z.enum(["inter", "manrope"]),
    radius: z.enum(["none", "sm", "md", "lg", "full"]),
    buttonStyle: z.enum(["solid", "outline-pill", "sharp"]),
    cardStyle: z.enum(["minimal", "framed", "elevated"]),
    cardImageRatio: z.enum(["4/5", "1/1", "3/4"]),
    sectionSpacing: z.enum(["compact", "comfortable", "airy"]),
    headingCase: z.enum(["normal", "uppercase"]),
  }),
  announcement: z.object({
    enabled: z.boolean(),
    messages: z.array(z.object({ en: z.string().max(140), bn: z.string().max(140), href: z.string().max(200).optional() })).max(5),
  }),
  footer: z.object({
    about: z.string().max(400),
    aboutBn: z.string().max(400),
    social: z.object({
      facebook: z.string().max(200),
      instagram: z.string().max(200),
      tiktok: z.string().max(200),
      youtube: z.string().max(200),
    }),
  }),
  tryon: z.object({
    enabled: z.boolean(),
    provider: z.enum(["google-vertex", "demo"]),
    googleProject: z.string().max(100),
    googleLocation: z.string().max(50),
    model: z.string().max(100),
    dailyLimitPerUser: z.number().int().min(1).max(100),
    dailyLimitGlobal: z.number().int().min(1).max(100000),
    retentionHours: z.number().int().min(1).max(24 * 30),
    maxUploadMb: z.number().int().min(1).max(10),
    estimatedCostPerImageMicroUsd: z.number().int().min(0),
    monthlyBudgetMicroUsd: z.number().int().min(0),
    consentVersion: z.string().max(20),
  }),
  payments: z.object({
    codEnabled: z.boolean(),
    codMaxOrderMinor: z.number().int().min(0),
    sslcommerzEnabled: z.boolean(),
    sslcommerzSandbox: z.boolean(),
  }),
  delivery: z.object({
    freeShippingThresholdMinor: z.number().int().min(0).nullable(),
    autoBookEnabled: z.boolean(),
    autoBookProvider: z.enum(["steadfast", "pathao"]).nullable(),
    autoBookRequirePhoneVerified: z.boolean(),
    autoBookMaxCodMinor: z.number().int().min(0),
    processingDaysText: z.string().max(120),
    returnPolicyDays: z.number().int().min(0).max(60),
  }),
  marketing: z.object({
    ga4Id: z.string().max(40),
    gtmId: z.string().max(40),
    metaPixelId: z.string().max(40),
    tiktokPixelId: z.string().max(40),
    requireConsent: z.boolean(),
  }),
  seo: z.object({
    defaultTitle: z.string().max(80),
    defaultDescription: z.string().max(200),
  }),
};

export type SettingKey = keyof typeof settingSchemas;
export type Settings = { [K in SettingKey]: z.infer<(typeof settingSchemas)[K]> };

export const APPEARANCE_PRESETS: Record<string, Settings["appearance"]["colors"]> = {
  "stadium-ivory": {
    background: "#f6f4ef",
    surface: "#ffffff",
    muted: "#ebe8e1",
    foreground: "#121212",
    mutedForeground: "#6b6760",
    border: "#dedad2",
    accent: "#0f5c3a",
    accentForeground: "#ffffff",
    sale: "#c2410c",
  },
  "night-match": {
    background: "#0e0f10",
    surface: "#17191b",
    muted: "#202326",
    foreground: "#f3f2ee",
    mutedForeground: "#9a9a94",
    border: "#2b2e31",
    accent: "#c8f169",
    accentForeground: "#0e0f10",
    sale: "#ff7a45",
  },
  "derby-red": {
    background: "#f7f5f2",
    surface: "#ffffff",
    muted: "#eeeae4",
    foreground: "#161414",
    mutedForeground: "#6e6863",
    border: "#e0dbd4",
    accent: "#b4161b",
    accentForeground: "#ffffff",
    sale: "#b4161b",
  },
  "cobalt-classic": {
    background: "#f4f5f7",
    surface: "#ffffff",
    muted: "#e7e9ee",
    foreground: "#0f1320",
    mutedForeground: "#5f6576",
    border: "#d9dce4",
    accent: "#1d3fd1",
    accentForeground: "#ffffff",
    sale: "#d1361d",
  },
};

export const DEFAULT_SETTINGS: Settings = {
  brand: {
    name: "JERSEY STUDIO",
    tagline: "Premium football jerseys, made personal.",
    logoUrl: null,
    supportPhone: "+880 1700-000000",
    supportEmail: "support@jerseystudio.example",
    address: "House 12, Road 5, Dhanmondi, Dhaka 1205",
  },
  appearance: {
    preset: "stadium-ivory",
    colors: APPEARANCE_PRESETS["stadium-ivory"],
    headingFont: "manrope",
    bodyFont: "inter",
    radius: "md",
    buttonStyle: "solid",
    cardStyle: "minimal",
    cardImageRatio: "4/5",
    sectionSpacing: "comfortable",
    headingCase: "normal",
  },
  announcement: {
    enabled: true,
    messages: [
      { en: "Free delivery on orders over ৳3,000", bn: "৳৩,০০০+ অর্ডারে ফ্রি ডেলিভারি", href: "/shipping-policy" },
      { en: "Cash on Delivery available across Bangladesh", bn: "সারা বাংলাদেশে ক্যাশ অন ডেলিভারি" },
      { en: "Add your name & number — printed in 48 hours", bn: "আপনার নাম ও নম্বর যোগ করুন — ৪৮ ঘণ্টায় প্রিন্ট" },
    ],
  },
  footer: {
    about: "Jersey Studio makes premium football jerseys and personalised kits for fans across Bangladesh.",
    aboutBn: "জার্সি স্টুডিও বাংলাদেশের ফুটবলপ্রেমীদের জন্য প্রিমিয়াম জার্সি ও পার্সোনালাইজড কিট তৈরি করে।",
    social: { facebook: "", instagram: "", tiktok: "", youtube: "" },
  },
  tryon: {
    enabled: true,
    provider: "google-vertex",
    googleProject: "",
    googleLocation: "us-central1",
    model: "virtual-try-on-001",
    dailyLimitPerUser: 5,
    dailyLimitGlobal: 500,
    retentionHours: 24,
    maxUploadMb: 8,
    estimatedCostPerImageMicroUsd: 60000,
    monthlyBudgetMicroUsd: 50_000_000,
    consentVersion: "2026-10",
  },
  payments: {
    codEnabled: true,
    codMaxOrderMinor: 5_000_000,
    sslcommerzEnabled: false,
    sslcommerzSandbox: true,
  },
  delivery: {
    freeShippingThresholdMinor: 300_000,
    autoBookEnabled: false,
    autoBookProvider: null,
    autoBookRequirePhoneVerified: true,
    autoBookMaxCodMinor: 1_000_000,
    processingDaysText: "Orders are processed within 1–2 business days.",
    returnPolicyDays: 7,
  },
  marketing: { ga4Id: "", gtmId: "", metaPixelId: "", tiktokPixelId: "", requireConsent: true },
  seo: {
    defaultTitle: "Jersey Studio — Premium Football Jerseys in Bangladesh",
    defaultDescription: "Shop club, national team and personalised football jerseys. Cash on delivery across Bangladesh.",
  },
};

function merge<K extends SettingKey>(key: K, stored: unknown): Settings[K] {
  const base = DEFAULT_SETTINGS[key] as Record<string, unknown>;
  const candidate = { ...base, ...(stored && typeof stored === "object" ? (stored as object) : {}) };
  const parsed = settingSchemas[key].safeParse(candidate);
  return (parsed.success ? parsed.data : base) as Settings[K];
}

/** Published settings (what the storefront uses). Cached per request. */
export const getSettings = cache(async (): Promise<Settings> => {
  const rows = await db.siteSetting.findMany();
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const out = {} as Settings;
  for (const key of Object.keys(settingSchemas) as SettingKey[]) {
    (out as Record<string, unknown>)[key] = merge(key, map.get(key));
  }
  return out;
});

export async function getSetting<K extends SettingKey>(key: K, opts?: { draft?: boolean }): Promise<Settings[K]> {
  const row = await db.siteSetting.findUnique({ where: { key } });
  return merge(key, opts?.draft ? (row?.draftValue ?? row?.value) : row?.value);
}

export async function saveSetting<K extends SettingKey>(
  key: K,
  value: Settings[K],
  opts: { actorId: string; draft?: boolean },
) {
  const parsed = settingSchemas[key].parse(value) as Prisma.InputJsonValue;
  if (opts.draft) {
    await db.siteSetting.upsert({
      where: { key },
      create: { key, value: DEFAULT_SETTINGS[key] as Prisma.InputJsonValue, draftValue: parsed, updatedById: opts.actorId },
      update: { draftValue: parsed, updatedById: opts.actorId },
    });
  } else {
    await db.siteSetting.upsert({
      where: { key },
      create: { key, value: parsed, updatedById: opts.actorId },
      update: { value: parsed, draftValue: Prisma.DbNull, updatedById: opts.actorId },
    });
  }
}
