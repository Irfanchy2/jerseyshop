/**
 * Seed script.
 *
 *   npm run db:seed            → base configuration (roles, permissions, settings, shipping, homepage)
 *   npm run db:seed -- --demo  → base + DEMO catalog, customers, orders & reviews (development only)
 *
 * Demo data uses fictional clubs and original artwork. Demo customers use the
 * @demo.jerseystudio.local domain and demo orders have isDemo=true so they can be purged
 * with `npm run db:purge-demo`. Never run --demo against production.
 */
import { PrismaClient, type KitType, type OrderStatus, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_ROLES, PERMISSIONS } from "../src/lib/auth/permissions";
import { DEFAULT_SECTIONS } from "../src/lib/cms/sections";
import type { JerseyDesign } from "../src/lib/jersey-art";

const db = new PrismaClient();
const DEMO = process.argv.includes("--demo");
const BDT = (n: number) => n * 100;

async function base() {
  for (const [key, p] of Object.entries(PERMISSIONS)) {
    await db.permission.upsert({ where: { key }, create: { key, ...p }, update: p });
  }
  for (const r of DEFAULT_ROLES) {
    const role = await db.role.upsert({
      where: { name: r.name },
      create: { name: r.name, description: r.description, isSystem: true },
      update: { description: r.description },
    });
    await db.rolePermission.deleteMany({ where: { roleId: role.id } });
    await db.rolePermission.createMany({ data: r.permissions.map((permissionKey) => ({ roleId: role.id, permissionKey })) });
  }

  const ownerEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@jerseystudio.local";
  let ownerPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!ownerPassword) {
    if (process.env.NODE_ENV === "production") throw new Error("Set SEED_ADMIN_PASSWORD to seed the owner account in production.");
    ownerPassword = "Admin12345";
  }
  const owner = await db.role.findUniqueOrThrow({ where: { name: "Owner" } });
  const existing = await db.user.findUnique({ where: { email: ownerEmail } });
  if (!existing) {
    await db.user.create({
      data: { email: ownerEmail, name: "Store Owner", passwordHash: await bcrypt.hash(ownerPassword, 12), kind: "STAFF", roleId: owner.id },
    });
    console.log(`Owner account created: ${ownerEmail}`);
  }

  const rates = [
    { code: "inside_dhaka", name: "Inside Dhaka", nameBn: "ঢাকার ভেতরে", feeMinor: BDT(70), etaText: "1–2 days", districts: ["Dhaka"], sortOrder: 0 },
    { code: "dhaka_suburbs", name: "Dhaka suburbs", nameBn: "ঢাকার আশেপাশে", feeMinor: BDT(100), etaText: "2–3 days", districts: ["Gazipur", "Narayanganj"], sortOrder: 1 },
    { code: "outside_dhaka", name: "Outside Dhaka", nameBn: "ঢাকার বাইরে", feeMinor: BDT(130), etaText: "2–4 days", districts: [], sortOrder: 2 },
  ];
  for (const r of rates) await db.shippingRate.upsert({ where: { code: r.code }, create: r, update: {} });

  await db.shippingProvider.upsert({
    where: { code: "steadfast" },
    create: { code: "steadfast", name: "Steadfast Courier", mode: "MOCK", publicConfig: { defaultNote: "Handle with care", deliveryType: 0 } },
    update: {},
  });
  await db.shippingProvider.upsert({
    where: { code: "pathao" },
    create: {
      code: "pathao", name: "Pathao Courier", mode: "MOCK",
      publicConfig: { storeId: null, deliveryType: 48, itemType: 2, itemWeightKg: 0.5, environment: "sandbox" },
    },
    update: {},
  });

  if ((await db.homepageSection.count()) === 0) {
    let i = 0;
    for (const s of DEFAULT_SECTIONS) {
      await db.homepageSection.create({
        data: { type: s.type, sortOrder: i, draftSortOrder: i, draftContent: s.content as Prisma.InputJsonValue, publishedContent: s.content as Prisma.InputJsonValue, publishedAt: new Date() },
      });
      i++;
    }
  }

  if (!(await db.customizationTemplate.findFirst())) {
    await db.customizationTemplate.create({
      data: {
        name: "Standard outfield (name + number)",
        nameArea: { x: 0.2, y: 0.24, w: 0.6, h: 0.08 },
        numberArea: { x: 0.25, y: 0.34, w: 0.5, h: 0.32 },
        frontNumberArea: { x: 0.56, y: 0.27, w: 0.12, h: 0.1 },
        allowedColors: ["#ffffff", "#111111", "#d4af37", "#c81d25", "#0f5c3a", "#1d3fd1"],
        allowedFonts: ["block", "classic", "modern"],
        priceMinor: BDT(350),
        maxNameLength: 12,
        maxNumberDigits: 2,
      },
    });
  }
}

// ───────────────────────────── demo catalog ─────────────────────────────

type TeamSeed = { slug: string; name: string; nameBn: string; kind: "CLUB" | "NATIONAL"; country?: string; league?: string; p: string; s: string; initials: string };
const TEAMS: TeamSeed[] = [
  { slug: "dhaka-riverside", name: "Dhaka Riverside FC", nameBn: "ঢাকা রিভারসাইড এফসি", kind: "CLUB", league: "Studio League", p: "#0b3d2e", s: "#f2efe6", initials: "DR" },
  { slug: "chattogram-mariners", name: "Chattogram Mariners", nameBn: "চট্টগ্রাম মেরিনার্স", kind: "CLUB", league: "Studio League", p: "#14213d", s: "#8ecae6", initials: "CM" },
  { slug: "sylhet-tea-valley", name: "Sylhet Tea Valley SC", nameBn: "সিলেট টি ভ্যালি এসসি", kind: "CLUB", league: "Studio League", p: "#14532d", s: "#d4af37", initials: "TV" },
  { slug: "rajshahi-mango-united", name: "Rajshahi Mango United", nameBn: "রাজশাহী ম্যাংগো ইউনাইটেড", kind: "CLUB", league: "Studio League", p: "#f59e0b", s: "#111111", initials: "RU" },
  { slug: "khulna-tigers", name: "Khulna Tigers AC", nameBn: "খুলনা টাইগার্স এসি", kind: "CLUB", league: "Studio League", p: "#ea580c", s: "#111111", initials: "KT" },
  { slug: "northern-star", name: "Northern Star FC", nameBn: "নর্দার্ন স্টার এফসি", kind: "CLUB", league: "Studio League", p: "#111111", s: "#f5f5f4", initials: "NS" },
  { slug: "old-town-athletic", name: "Old Town Athletic", nameBn: "ওল্ড টাউন অ্যাথলেটিক", kind: "CLUB", league: "Studio League", p: "#6b1d2a", s: "#9fd3f5", initials: "OT" },
  { slug: "bangladesh", name: "Bangladesh", nameBn: "বাংলাদেশ", kind: "NATIONAL", country: "BD", p: "#006a4e", s: "#f42a41", initials: "BD" },
  { slug: "argentina", name: "Argentina", nameBn: "আর্জেন্টিনা", kind: "NATIONAL", country: "AR", p: "#75aadb", s: "#ffffff", initials: "ARG" },
  { slug: "brazil", name: "Brazil", nameBn: "ব্রাজিল", kind: "NATIONAL", country: "BR", p: "#fedd00", s: "#009c3b", initials: "BRA" },
  { slug: "germany", name: "Germany", nameBn: "জার্মানি", kind: "NATIONAL", country: "DE", p: "#f5f5f4", s: "#111111", initials: "GER" },
  { slug: "portugal", name: "Portugal", nameBn: "পর্তুগাল", kind: "NATIONAL", country: "PT", p: "#9b1b30", s: "#006600", initials: "POR" },
];

const CATEGORIES = [
  { slug: "club-jerseys", name: "Club jerseys", nameBn: "ক্লাব জার্সি", sortOrder: 0 },
  { slug: "national-team-jerseys", name: "National team jerseys", nameBn: "জাতীয় দলের জার্সি", sortOrder: 1 },
  { slug: "custom-jerseys", name: "Custom jerseys", nameBn: "কাস্টম জার্সি", sortOrder: 2 },
  { slug: "training-kits", name: "Training kits", nameBn: "ট্রেনিং কিট", sortOrder: 3 },
  { slug: "retro", name: "Retro classics", nameBn: "রেট্রো ক্লাসিক", sortOrder: 4 },
  { slug: "fan-collection", name: "Fan collection", nameBn: "ফ্যান কালেকশন", sortOrder: 5 },
];

const COLLECTIONS = [
  { slug: "season-26-27", name: "Season 26/27", nameBn: "সিজন ২৬/২৭", kind: "SEASONAL" as const, accentHex: "#10231b", isFeatured: true, description: "This season's home, away and third kits." },
  { slug: "retro-classics", name: "Retro classics", nameBn: "রেট্রো ক্লাসিক", kind: "CURATED" as const, accentHex: "#6b1d2a", isFeatured: true, description: "Throwback cuts, heritage collars and vintage colourways." },
  { slug: "fan-favourites", name: "Fan favourites", nameBn: "ফ্যানদের পছন্দ", kind: "CURATED" as const, accentHex: "#14213d", isFeatured: true, description: "The jerseys our community keeps coming back for." },
  { slug: "personalised", name: "Personalised", nameBn: "পার্সোনালাইজড", kind: "CURATED" as const, accentHex: "#3f2a1d", isFeatured: false, description: "Every jersey here can carry your name and number." },
  { slug: "national-pride", name: "National pride", nameBn: "জাতীয় গর্ব", kind: "NATIONAL" as const, accentHex: "#006a4e", isFeatured: false, description: "Supporters' editions for match days." },
  { slug: "training-ground", name: "Training ground", nameBn: "ট্রেনিং গ্রাউন্ড", kind: "TRAINING" as const, accentHex: "#1f2937", isFeatured: false, description: "Lightweight performance tops for practice and the gym." },
];

type ProductSeed = {
  name: string; nameBn: string; team?: string; category: string; season?: string; kit: KitType; price: number; compareAt?: number;
  design: JerseyDesign; colorName: string; collections: string[]; featured?: boolean; best?: boolean; customizable?: boolean; tryOn?: boolean;
  tags?: string[]; daysAgo?: number; colors?: { name: string; hex: string; design: Partial<JerseyDesign> }[];
};

function t(slug: string) {
  return TEAMS.find((x) => x.slug === slug)!;
}

const PRODUCTS: ProductSeed[] = [
  { name: "Dhaka Riverside 26/27 Home Jersey", nameBn: "ঢাকা রিভারসাইড ২৬/২৭ হোম জার্সি", team: "dhaka-riverside", category: "club-jerseys", season: "2026/27", kit: "HOME", price: 1890, design: { pattern: "stripes", base: "#0b3d2e", secondary: "#f2efe6", trim: "#d4af37", crest: { shape: "shield", initials: "DR" } }, colorName: "Forest / Ivory", collections: ["season-26-27", "fan-favourites", "personalised"], featured: true, best: true, customizable: true, tryOn: true, daysAgo: 6 },
  { name: "Dhaka Riverside 26/27 Away Jersey", nameBn: "ঢাকা রিভারসাইড ২৬/২৭ অ্যাওয়ে জার্সি", team: "dhaka-riverside", category: "club-jerseys", season: "2026/27", kit: "AWAY", price: 1890, design: { pattern: "band", base: "#f2efe6", secondary: "#0b3d2e", trim: "#0b3d2e", collar: "v", crest: { shape: "shield", initials: "DR", color: "#0b3d2e" } }, colorName: "Ivory", collections: ["season-26-27", "personalised"], customizable: true, tryOn: true, daysAgo: 4 },
  { name: "Chattogram Mariners 26/27 Home Jersey", nameBn: "চট্টগ্রাম মেরিনার্স ২৬/২৭ হোম জার্সি", team: "chattogram-mariners", category: "club-jerseys", season: "2026/27", kit: "HOME", price: 1850, design: { pattern: "hoops", base: "#14213d", secondary: "#8ecae6", trim: "#ffffff", crest: { shape: "circle", initials: "CM" } }, colorName: "Navy / Sky", collections: ["season-26-27", "personalised"], best: true, customizable: true, tryOn: true, daysAgo: 12 },
  { name: "Chattogram Mariners 26/27 Away Jersey", nameBn: "চট্টগ্রাম মেরিনার্স ২৬/২৭ অ্যাওয়ে জার্সি", team: "chattogram-mariners", category: "club-jerseys", season: "2026/27", kit: "AWAY", price: 1850, design: { pattern: "sash", base: "#f8fafc", secondary: "#14213d", trim: "#14213d", collar: "polo", crest: { shape: "circle", initials: "CM", color: "#14213d" } }, colorName: "White / Navy", collections: ["season-26-27"], featured: true, tryOn: true, daysAgo: 3 },
  { name: "Sylhet Tea Valley 26/27 Home Jersey", nameBn: "সিলেট টি ভ্যালি ২৬/২৭ হোম জার্সি", team: "sylhet-tea-valley", category: "club-jerseys", season: "2026/27", kit: "HOME", price: 1790, compareAt: 2090, design: { pattern: "pinstripe", base: "#14532d", secondary: "#2f7a4a", trim: "#d4af37", collar: "v", crest: { shape: "shield", initials: "TV" } }, colorName: "Tea Green", collections: ["season-26-27", "fan-favourites", "personalised"], best: true, customizable: true, tryOn: true, daysAgo: 20 },
  { name: "Rajshahi Mango United 26/27 Home Jersey", nameBn: "রাজশাহী ম্যাংগো ইউনাইটেড ২৬/২৭ হোম জার্সি", team: "rajshahi-mango-united", category: "club-jerseys", season: "2026/27", kit: "HOME", price: 1750, design: { pattern: "plain", base: "#f59e0b", secondary: "#111111", trim: "#111111", sleeveColor: "#111111", crest: { shape: "diamond", initials: "RU" } }, colorName: "Mango / Black", collections: ["season-26-27", "personalised"], customizable: true, tryOn: true, daysAgo: 9 },
  { name: "Khulna Tigers 26/27 Home Jersey", nameBn: "খুলনা টাইগার্স ২৬/২৭ হোম জার্সি", team: "khulna-tigers", category: "club-jerseys", season: "2026/27", kit: "HOME", price: 1790, design: { pattern: "chevron", base: "#ea580c", secondary: "#111111", trim: "#111111", crest: { shape: "shield", initials: "KT" } }, colorName: "Tiger Orange", collections: ["season-26-27", "fan-favourites"], featured: true, tryOn: true, customizable: true, daysAgo: 15 },
  { name: "Northern Star 26/27 Home Jersey", nameBn: "নর্দার্ন স্টার ২৬/২৭ হোম জার্সি", team: "northern-star", category: "club-jerseys", season: "2026/27", kit: "HOME", price: 1890, design: { pattern: "stripes", base: "#111111", secondary: "#f5f5f4", trim: "#f5f5f4", collar: "v", crest: { shape: "circle", initials: "NS" } }, colorName: "Black / White", collections: ["season-26-27"], tryOn: true, customizable: true, daysAgo: 2 },
  { name: "Northern Star 26/27 Third Jersey", nameBn: "নর্দার্ন স্টার ২৬/২৭ থার্ড জার্সি", team: "northern-star", category: "club-jerseys", season: "2026/27", kit: "THIRD", price: 1990, design: { pattern: "gradient", base: "#312e81", secondary: "#0f172a", trim: "#a5b4fc", crest: { shape: "circle", initials: "NS", color: "#a5b4fc" } }, colorName: "Midnight Fade", collections: ["season-26-27"], tryOn: true, daysAgo: 1 },
  { name: "Old Town Athletic 26/27 Home Jersey", nameBn: "ওল্ড টাউন অ্যাথলেটিক ২৬/২৭ হোম জার্সি", team: "old-town-athletic", category: "club-jerseys", season: "2026/27", kit: "HOME", price: 1850, design: { pattern: "plain", base: "#6b1d2a", secondary: "#9fd3f5", trim: "#9fd3f5", sleeveColor: "#9fd3f5", crest: { shape: "shield", initials: "OT" } }, colorName: "Claret / Sky", collections: ["season-26-27", "personalised"], customizable: true, tryOn: true, daysAgo: 25 },
  { name: "Old Town Athletic 25/26 Away Jersey", nameBn: "ওল্ড টাউন অ্যাথলেটিক ২৫/২৬ অ্যাওয়ে জার্সি", team: "old-town-athletic", category: "club-jerseys", season: "2025/26", kit: "AWAY", price: 1490, compareAt: 1850, design: { pattern: "halves", base: "#9fd3f5", secondary: "#f8fafc", trim: "#6b1d2a", crest: { shape: "shield", initials: "OT", color: "#6b1d2a" } }, colorName: "Sky / White", collections: ["fan-favourites"], tryOn: true, daysAgo: 200 },
  { name: "Khulna Tigers 25/26 Away Jersey", nameBn: "খুলনা টাইগার্স ২৫/২৬ অ্যাওয়ে জার্সি", team: "khulna-tigers", category: "club-jerseys", season: "2025/26", kit: "AWAY", price: 1390, compareAt: 1790, design: { pattern: "quarters", base: "#111111", secondary: "#ea580c", trim: "#ea580c", crest: { shape: "shield", initials: "KT" } }, colorName: "Black / Orange", collections: [], daysAgo: 230 },

  { name: "Bangladesh Supporters 26 Home Jersey", nameBn: "বাংলাদেশ সাপোর্টার্স ২৬ হোম জার্সি", team: "bangladesh", category: "national-team-jerseys", season: "2026", kit: "FAN", price: 1590, design: { pattern: "plain", base: "#006a4e", secondary: "#f42a41", trim: "#f42a41", collar: "v", crest: { shape: "circle", initials: "BD", color: "#f42a41" } }, colorName: "Bottle Green", collections: ["national-pride", "fan-favourites", "personalised"], featured: true, best: true, customizable: true, tryOn: true, daysAgo: 10 },
  { name: "Bangladesh Supporters 26 Away Jersey", nameBn: "বাংলাদেশ সাপোর্টার্স ২৬ অ্যাওয়ে জার্সি", team: "bangladesh", category: "national-team-jerseys", season: "2026", kit: "FAN", price: 1590, design: { pattern: "sash", base: "#f8f7f2", secondary: "#006a4e", trim: "#f42a41", crest: { shape: "circle", initials: "BD", color: "#006a4e" } }, colorName: "Off-white", collections: ["national-pride", "personalised"], customizable: true, tryOn: true, daysAgo: 8 },
  { name: "Argentina Supporters 26 Home Jersey", nameBn: "আর্জেন্টিনা সাপোর্টার্স ২৬ হোম জার্সি", team: "argentina", category: "national-team-jerseys", season: "2026", kit: "FAN", price: 1690, design: { pattern: "stripes", base: "#ffffff", secondary: "#75aadb", trim: "#111111", crest: { shape: "circle", initials: "ARG", color: "#14213d" } }, colorName: "Sky / White", collections: ["national-pride", "fan-favourites", "personalised"], best: true, customizable: true, tryOn: true, daysAgo: 30 },
  { name: "Brazil Supporters 26 Home Jersey", nameBn: "ব্রাজিল সাপোর্টার্স ২৬ হোম জার্সি", team: "brazil", category: "national-team-jerseys", season: "2026", kit: "FAN", price: 1690, design: { pattern: "plain", base: "#fedd00", secondary: "#009c3b", trim: "#009c3b", collar: "v", crest: { shape: "diamond", initials: "BRA", color: "#009c3b" } }, colorName: "Canary", collections: ["national-pride", "fan-favourites", "personalised"], best: true, customizable: true, tryOn: true, daysAgo: 28 },
  { name: "Germany Supporters 26 Home Jersey", nameBn: "জার্মানি সাপোর্টার্স ২৬ হোম জার্সি", team: "germany", category: "national-team-jerseys", season: "2026", kit: "FAN", price: 1690, design: { pattern: "band", base: "#f5f5f4", secondary: "#111111", trim: "#111111", crest: { shape: "shield", initials: "GER", color: "#111111" } }, colorName: "White", collections: ["national-pride"], tryOn: true, customizable: true, daysAgo: 35 },
  { name: "Portugal Supporters 26 Home Jersey", nameBn: "পর্তুগাল সাপোর্টার্স ২৬ হোম জার্সি", team: "portugal", category: "national-team-jerseys", season: "2026", kit: "FAN", price: 1690, design: { pattern: "halves", base: "#9b1b30", secondary: "#7a1526", trim: "#006600", collar: "polo", crest: { shape: "shield", initials: "POR", color: "#006600" } }, colorName: "Crimson", collections: ["national-pride"], tryOn: true, daysAgo: 40 },
  { name: "Argentina Supporters 26 Away Jersey", nameBn: "আর্জেন্টিনা সাপোর্টার্স ২৬ অ্যাওয়ে জার্সি", team: "argentina", category: "national-team-jerseys", season: "2026", kit: "FAN", price: 1690, design: { pattern: "gradient", base: "#1e1b4b", secondary: "#4c1d95", trim: "#75aadb", crest: { shape: "circle", initials: "ARG", color: "#75aadb" } }, colorName: "Deep Violet", collections: ["national-pride"], tryOn: true, daysAgo: 5 },

  { name: "Studio Custom Team Jersey", nameBn: "স্টুডিও কাস্টম টিম জার্সি", category: "custom-jerseys", kit: "CUSTOM", price: 1490, design: { pattern: "plain", base: "#1f2937", secondary: "#ffffff", trim: "#ffffff", crest: { shape: "shield", initials: "JS" } }, colorName: "Charcoal", collections: ["personalised"], featured: true, customizable: true, tryOn: true, tags: ["custom", "team", "personalised"], daysAgo: 14,
    colors: [
      { name: "Charcoal", hex: "#1f2937", design: { base: "#1f2937", trim: "#ffffff" } },
      { name: "Royal Blue", hex: "#1d3fd1", design: { base: "#1d3fd1", trim: "#ffffff" } },
      { name: "Scarlet", hex: "#c81d25", design: { base: "#c81d25", trim: "#111111" } },
      { name: "Pitch Green", hex: "#0f5c3a", design: { base: "#0f5c3a", trim: "#d4af37" } },
    ] },
  { name: "Studio Custom Stripe Jersey", nameBn: "স্টুডিও কাস্টম স্ট্রাইপ জার্সি", category: "custom-jerseys", kit: "CUSTOM", price: 1590, design: { pattern: "stripes", base: "#0f172a", secondary: "#334155", trim: "#e2e8f0", collar: "v", crest: { shape: "shield", initials: "JS" } }, colorName: "Slate", collections: ["personalised"], customizable: true, tryOn: true, tags: ["custom", "team"], daysAgo: 18 },

  { name: "Studio Pro Training Top", nameBn: "স্টুডিও প্রো ট্রেনিং টপ", category: "training-kits", kit: "TRAINING", price: 1190, design: { pattern: "chevron", base: "#1f2937", secondary: "#c8f169", trim: "#c8f169", collar: "crew" }, colorName: "Graphite / Volt", collections: ["training-ground"], best: true, tryOn: true, tags: ["training", "gym"], daysAgo: 22,
    colors: [
      { name: "Graphite / Volt", hex: "#1f2937", design: { base: "#1f2937", secondary: "#c8f169", trim: "#c8f169" } },
      { name: "Navy / Sky", hex: "#14213d", design: { base: "#14213d", secondary: "#8ecae6", trim: "#8ecae6" } },
    ] },
  { name: "Studio Long-Sleeve Training Top", nameBn: "স্টুডিও লং-স্লিভ ট্রেনিং টপ", category: "training-kits", kit: "TRAINING", price: 1390, design: { pattern: "plain", base: "#0f172a", secondary: "#38bdf8", trim: "#38bdf8", longSleeve: true, sleeveColor: "#1e293b" }, colorName: "Midnight", collections: ["training-ground"], tryOn: true, tags: ["training", "winter"], daysAgo: 7 },
  { name: "Dhaka Riverside Pre-Match Top", nameBn: "ঢাকা রিভারসাইড প্রি-ম্যাচ টপ", team: "dhaka-riverside", category: "training-kits", season: "2026/27", kit: "TRAINING", price: 1290, design: { pattern: "gradient", base: "#0b3d2e", secondary: "#14532d", trim: "#d4af37", crest: { shape: "shield", initials: "DR" } }, colorName: "Forest Fade", collections: ["training-ground", "season-26-27"], tryOn: true, daysAgo: 11 },

  { name: "Dhaka Riverside 1998 Retro Jersey", nameBn: "ঢাকা রিভারসাইড ১৯৯৮ রেট্রো জার্সি", team: "dhaka-riverside", category: "retro", season: "Retro 1998", kit: "RETRO", price: 2190, design: { pattern: "halves", base: "#0b3d2e", secondary: "#f2efe6", trim: "#f2efe6", collar: "polo", crest: { shape: "circle", initials: "DR" } }, colorName: "Heritage", collections: ["retro-classics", "fan-favourites"], featured: true, tryOn: true, daysAgo: 45 },
  { name: "Chattogram Mariners 1994 Retro Jersey", nameBn: "চট্টগ্রাম মেরিনার্স ১৯৯৪ রেট্রো জার্সি", team: "chattogram-mariners", category: "retro", season: "Retro 1994", kit: "RETRO", price: 2190, design: { pattern: "quarters", base: "#14213d", secondary: "#8ecae6", trim: "#ffffff", collar: "polo", crest: { shape: "circle", initials: "CM" } }, colorName: "Harbour", collections: ["retro-classics"], tryOn: true, daysAgo: 50 },
  { name: "Old Town Athletic 1986 Retro Jersey", nameBn: "ওল্ড টাউন অ্যাথলেটিক ১৯৮৬ রেট্রো জার্সি", team: "old-town-athletic", category: "retro", season: "Retro 1986", kit: "RETRO", price: 2290, design: { pattern: "pinstripe", base: "#6b1d2a", secondary: "#9fd3f5", trim: "#9fd3f5", collar: "polo", longSleeve: true, crest: { shape: "shield", initials: "OT" } }, colorName: "Claret", collections: ["retro-classics"], daysAgo: 60 },
  { name: "Bangladesh 1999 Retro Supporters Jersey", nameBn: "বাংলাদেশ ১৯৯৯ রেট্রো সাপোর্টার্স জার্সি", team: "bangladesh", category: "retro", season: "Retro 1999", kit: "RETRO", price: 2190, design: { pattern: "chevron", base: "#006a4e", secondary: "#f42a41", trim: "#ffffff", collar: "polo", crest: { shape: "circle", initials: "BD", color: "#f42a41" } }, colorName: "Green / Red", collections: ["retro-classics", "national-pride"], best: true, tryOn: true, daysAgo: 55 },

  { name: "Match Day Fan Tee — Riverside", nameBn: "ম্যাচ ডে ফ্যান টি — রিভারসাইড", team: "dhaka-riverside", category: "fan-collection", kit: "FAN", price: 890, design: { pattern: "plain", base: "#f2efe6", secondary: "#0b3d2e", trim: "#0b3d2e", crest: { shape: "shield", initials: "DR", color: "#0b3d2e" } }, colorName: "Ivory", collections: ["fan-favourites"], tryOn: true, daysAgo: 16 },
  { name: "Match Day Fan Tee — Tigers", nameBn: "ম্যাচ ডে ফ্যান টি — টাইগার্স", team: "khulna-tigers", category: "fan-collection", kit: "FAN", price: 890, design: { pattern: "plain", base: "#111111", secondary: "#ea580c", trim: "#ea580c", crest: { shape: "shield", initials: "KT" } }, colorName: "Black", collections: [], tryOn: true, daysAgo: 19 },
  { name: "Studio Goalkeeper Jersey", nameBn: "স্টুডিও গোলকিপার জার্সি", category: "custom-jerseys", kit: "GOALKEEPER", price: 1690, design: { pattern: "gradient", base: "#65a30d", secondary: "#14532d", trim: "#111111", longSleeve: true, crest: { shape: "shield", initials: "JS", color: "#111111" } }, colorName: "Lime", collections: ["personalised"], customizable: true, tryOn: true, tags: ["goalkeeper", "gk"], daysAgo: 26 },
];

const SIZES = ["S", "M", "L", "XL", "XXL"];

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// Deterministic PRNG so demo data is stable across runs.
let seedState = 42;
function rand() {
  seedState = (seedState * 1664525 + 1013904223) % 4294967296;
  return seedState / 4294967296;
}
const pickOne = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];

async function demo() {
  if (process.env.NODE_ENV === "production") throw new Error("Refusing to seed demo data in production.");
  if (await db.product.count()) {
    console.log("Products already exist — skipping demo catalog.");
    return;
  }
  for (const c of CATEGORIES) await db.category.create({ data: c });
  for (const tm of TEAMS)
    await db.team.create({ data: { slug: tm.slug, name: tm.name, nameBn: tm.nameBn, kind: tm.kind, country: tm.country, league: tm.league, primaryHex: tm.p, secondaryHex: tm.s } });
  let ci = 0;
  for (const c of COLLECTIONS) await db.collection.create({ data: { ...c, sortOrder: ci++ } });
  const template = await db.customizationTemplate.findFirstOrThrow();

  for (const p of PRODUCTS) {
    const slug = slugify(p.name);
    const cat = await db.category.findUniqueOrThrow({ where: { slug: p.category } });
    const team = p.team ? await db.team.findUniqueOrThrow({ where: { slug: p.team } }) : null;
    const publishedAt = new Date(Date.now() - (p.daysAgo ?? 30) * 86400000);
    const teamName = team ? t(p.team!).name : "Jersey Studio";
    const product = await db.product.create({
      data: {
        slug, name: p.name, nameBn: p.nameBn, status: "ACTIVE", categoryId: cat.id, teamId: team?.id, season: p.season, kitType: p.kit,
        description: `${p.name} in ${p.colorName}. Engineered from a lightweight, quick-dry performance knit with laser-cut ventilation zones — designed for humid match days in Bangladesh. An original ${teamName} design by Jersey Studio.`,
        descriptionBn: `${p.nameBn}। হালকা, দ্রুত শুকানো পারফরম্যান্স নিট কাপড়ে তৈরি — বাংলাদেশের আর্দ্র আবহাওয়ার জন্য উপযোগী।`,
        priceMinor: BDT(p.price), compareAtMinor: p.compareAt ? BDT(p.compareAt) : null,
        fabric: "100% recycled polyester performance knit, 140 gsm", care: "Machine wash cold inside out. Do not iron prints. Line dry in shade.",
        fit: "Regular athletic fit. Size up for a relaxed look.",
        tags: [...(p.tags ?? []), p.kit.toLowerCase(), ...(team ? [team.slug] : [])],
        isFeatured: !!p.featured, isBestSeller: !!p.best, design: p.design as unknown as Prisma.InputJsonValue,
        tryOnEnabled: !!p.tryOn, garmentImageUrl: `/art/jersey/${slug}/garment.png`,
        customizable: !!p.customizable, templateId: p.customizable ? template.id : null,
        publishedAt, createdAt: publishedAt,
        seoTitle: `${p.name} | Jersey Studio`,
        images: {
          create: [
            { url: `/art/jersey/${slug}/front.svg`, alt: `${p.name} — front`, kind: "FRONT", sortOrder: 0 },
            { url: `/art/jersey/${slug}/back.svg`, alt: `${p.name} — back`, kind: "BACK", sortOrder: 1 },
          ],
        },
      },
    });
    const colors = p.colors ?? [{ name: p.colorName, hex: p.design.base, design: {} }];
    let order = 0;
    for (const color of colors) {
      for (const size of SIZES) {
        const stock = Math.floor(rand() * 26) + (size === "XXL" ? 0 : 3);
        const v = await db.productVariant.create({
          data: {
            productId: product.id, size, color: color.name, colorHex: color.hex,
            sku: `JS-${slug.split("-").map((w) => w[0]).join("").toUpperCase().slice(0, 6)}-${slugify(color.name).slice(0, 4).toUpperCase()}-${size}`,
            stock, sortOrder: order++,
          },
        });
        await db.inventoryMovement.create({ data: { variantId: v.id, delta: stock, reason: "seed", stockAfter: stock } });
      }
    }
    for (const cslug of p.collections) {
      const col = await db.collection.findUniqueOrThrow({ where: { slug: cslug } });
      await db.productCollection.create({ data: { productId: product.id, collectionId: col.id } });
    }
  }

  await db.coupon.createMany({
    data: [
      { code: "WELCOME10", description: "10% off your first order (max ৳300)", type: "PERCENT", value: 10, maxDiscountMinor: BDT(300), perCustomerLimit: 1 },
      { code: "FREESHIP", description: "Free delivery on orders over ৳2,000", type: "FREE_SHIPPING", value: 0, minSubtotalMinor: BDT(2000) },
      { code: "MATCHDAY500", description: "৳500 off orders over ৳4,000", type: "FIXED", value: BDT(500), minSubtotalMinor: BDT(4000), usageLimit: 200 },
    ],
  });

  const custom = await db.product.findUniqueOrThrow({ where: { slug: "studio-custom-team-jersey" } });
  const training = await db.product.findUniqueOrThrow({ where: { slug: "studio-pro-training-top" } });
  await db.bundle.create({
    data: { name: "Match + Training pack", description: "Custom team jersey with a training top — save 10%", discountPercent: 10, items: { create: [{ productId: custom.id }, { productId: training.id }] } },
  });

  // Demo customers & orders (fictional people, clearly flagged).
  const names = ["Arif Hossain", "Nusrat Jahan", "Tanvir Ahmed", "Farhana Akter", "Rakib Hasan", "Sadia Islam", "Mehedi Hasan", "Tasnim Rahman", "Imran Kabir", "Shirin Sultana", "Fahim Chowdhury", "Lamia Haque"];
  const districts: [string, string, string][] = [["Dhaka", "Dhaka", "Dhanmondi"], ["Dhaka", "Dhaka", "Mirpur 10"], ["Dhaka", "Gazipur", "Tongi"], ["Chattogram", "Chattogram", "Agrabad"], ["Sylhet", "Sylhet", "Zindabazar"], ["Rajshahi", "Rajshahi", "Shaheb Bazar"], ["Khulna", "Khulna", "Sonadanga"], ["Dhaka", "Narayanganj", "Chashara"]];
  const pw = await bcrypt.hash("Customer123", 10);
  const customers = [];
  for (let i = 0; i < names.length; i++) {
    customers.push(
      await db.user.create({
        data: {
          email: `${slugify(names[i])}@demo.jerseystudio.local`, name: names[i], phone: `017${String(10000000 + i * 734521).slice(0, 8)}`,
          passwordHash: pw, createdAt: new Date(Date.now() - (90 - i * 5) * 86400000), profile: { create: {} },
        },
      }),
    );
  }

  const variants = await db.productVariant.findMany({ include: { product: { include: { images: true } } } });
  const statuses: OrderStatus[] = ["DELIVERED", "DELIVERED", "DELIVERED", "DELIVERED", "SHIPPED", "CONFIRMED", "PENDING", "CANCELLED", "PROCESSING"];
  const rates = await db.shippingRate.findMany();
  for (let n = 0; n < 64; n++) {
    const cust = rand() < 0.7 ? pickOne(customers) : null;
    const [division, district, area] = pickOne(districts);
    const daysAgo = Math.floor(rand() * 60);
    const placedAt = new Date(Date.now() - daysAgo * 86400000 - Math.floor(rand() * 86400000));
    const status: OrderStatus = daysAgo < 2 ? pickOne<OrderStatus>(["PENDING", "CONFIRMED", "PROCESSING"]) : pickOne(statuses);
    const lineCount = rand() < 0.75 ? 1 : 2;
    const items = Array.from({ length: lineCount }, () => {
      const v = pickOne(variants);
      const qty = rand() < 0.85 ? 1 : 2;
      return { v, qty };
    });
    const subtotal = items.reduce((s, i) => s + i.v.product.priceMinor * i.qty, 0);
    const rate = rates.find((r) => r.districts.includes(district)) ?? rates.find((r) => r.code === "outside_dhaka")!;
    const shipping = subtotal >= BDT(3000) && district === "Dhaka" ? 0 : rate.feeMinor;
    const name = cust?.name ?? pickOne(names);
    const phone = cust?.phone ?? `018${String(20000000 + n * 91373).slice(0, 8)}`;
    await db.order.create({
      data: {
        number: `JS-${String(100100 + n)}`, userId: cust?.id, email: cust?.email, phone, customerName: name, status,
        paymentMethod: "COD", paymentStatus: status === "DELIVERED" ? "PAID" : "UNPAID",
        subtotalMinor: subtotal, shippingMinor: shipping, totalMinor: subtotal + shipping, shippingRateCode: rate.code,
        idempotencyKey: `demo-${n}`, isDemo: true, placedAt,
        confirmedAt: status !== "PENDING" && status !== "CANCELLED" ? placedAt : null,
        deliveredAt: status === "DELIVERED" ? new Date(placedAt.getTime() + 3 * 86400000) : null,
        cancelledAt: status === "CANCELLED" ? new Date(placedAt.getTime() + 86400000) : null,
        items: {
          create: items.map(({ v, qty }) => ({
            productId: v.productId, variantId: v.id, productName: v.product.name, sku: v.sku, size: v.size, color: v.color,
            imageUrl: v.product.images[0]?.url, unitPriceMinor: v.product.priceMinor, quantity: qty, lineTotalMinor: v.product.priceMinor * qty,
          })),
        },
        address: { create: { name, phone, line1: `House ${1 + Math.floor(rand() * 90)}, Road ${1 + Math.floor(rand() * 20)}`, area, district, division } },
        events: { create: [{ status: "PENDING", note: "Order placed (demo)", createdAt: placedAt }, ...(status !== "PENDING" ? [{ status, createdAt: new Date(placedAt.getTime() + 86400000) }] : [])] },
      },
    });
  }

  // Demo reviews only from demo customers who have a delivered demo order for that product.
  const delivered = await db.orderItem.findMany({ where: { order: { status: "DELIVERED", isDemo: true, userId: { not: null } } }, include: { order: true } });
  const bodies = [
    ["Great fit and breathable", "Fabric stays cool even in the afternoon heat. True to size."],
    ["Print quality is excellent", "Name and number came out sharp. Delivery took two days to Chattogram."],
    ["Lovely colour", "Looks even better in person. Would order again."],
    ["Good value", "Comfortable for weekend matches. Sizing runs slightly slim."],
  ];
  const seen = new Set<string>();
  for (const it of delivered.slice(0, 18)) {
    const key = `${it.order.userId}-${it.productId}`;
    if (seen.has(key) || !it.productId) continue;
    seen.add(key);
    const [title, body] = pickOne(bodies);
    await db.review.create({
      data: { productId: it.productId, userId: it.order.userId!, orderItemId: it.id, rating: rand() < 0.7 ? 5 : 4, title, body, status: "APPROVED", createdAt: it.order.deliveredAt ?? new Date() },
    });
  }
  console.log("Demo catalog, customers, orders and reviews created (flagged as demo).");
}

async function main() {
  await base();
  if (DEMO) await demo();
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
