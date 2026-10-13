import { z } from "zod";

const href = z.string().max(200);
const text = (max = 200) => z.string().max(max);
const optUrl = z.string().max(500).nullable();

export const sectionSchemas = {
  hero: z.object({
    eyebrow: text(60), eyebrowBn: text(60),
    headline: text(90), headlineBn: text(120),
    // Second headline line, set in heavy italic beneath the light first line.
    headlineBold: text(60).default(""), headlineBoldBn: text(80).default(""),
    sub: text(220), subBn: text(260),
    ctaLabel: text(30), ctaLabelBn: text(40), ctaHref: href,
    secondaryLabel: text(30), secondaryLabelBn: text(40), secondaryHref: href,
    imageUrl: optUrl,
    videoUrl: optUrl,
    featuredProductSlugs: z.array(z.string()).max(7),
    bgColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    tone: z.enum(["dark", "light"]),
  }),
  edits: z.object({
    eyebrow: text(60).default(""), eyebrowBn: text(60).default(""),
    title: text(60), titleBn: text(80), href: href.default(""),
    items: z.array(z.object({ label: text(24), labelBn: text(40), href, productSlug: z.string().nullable(), imageUrl: optUrl })).max(3),
  }),
  category_cards: z.object({
    eyebrow: text(60).default(""), eyebrowBn: text(60).default(""),
    title: text(60), titleBn: text(80),
    items: z.array(z.object({ label: text(40), labelBn: text(60), href, productSlug: z.string().nullable(), imageUrl: optUrl, bgColor: z.string() })).max(8),
  }),
  featured_collections: z.object({
    eyebrow: text(60).default(""), eyebrowBn: text(60).default(""),
    title: text(60), titleBn: text(80), collectionSlugs: z.array(z.string()).max(6),
  }),
  product_rail: z.object({
    eyebrow: text(60).default(""), eyebrowBn: text(60).default(""),
    title: text(60), titleBn: text(80),
    sub: text(200).default(""), subBn: text(240).default(""),
    align: z.enum(["left", "center"]).default("left"),
    columns: z.number().int().min(3).max(4).default(4),
    // Optional button under a centred grid (e.g. "See more").
    ctaLabel: text(40).default(""), ctaLabelBn: text(50).default(""),
    source: z.enum(["best", "new", "featured", "collection", "manual"]),
    collectionSlug: z.string().nullable(),
    productSlugs: z.array(z.string()).max(12),
    limit: z.number().int().min(2).max(12),
    href,
  }),
  club_national: z.object({ title: text(60), titleBn: text(80) }),
  personalise_promo: z.object({
    eyebrow: text(60), eyebrowBn: text(60), headline: text(90), headlineBn: text(120), body: text(260), bodyBn: text(300),
    ctaLabel: text(30), ctaLabelBn: text(40), productSlug: z.string().nullable(), sampleName: text(12), sampleNumber: text(2),
  }),
  tryon_promo: z.object({
    eyebrow: text(60), eyebrowBn: text(60), headline: text(90), headlineBn: text(120), body: text(260), bodyBn: text(300),
    ctaLabel: text(30), ctaLabelBn: text(40),
  }),
  // Headline/body may contain {maxOff}: replaced with the largest live discount; the banner hides if nothing is on sale.
  editorial_banner: z.object({
    eyebrow: text(60), eyebrowBn: text(60), headline: text(90), headlineBn: text(120), body: text(260), bodyBn: text(300),
    ctaLabel: text(30), ctaLabelBn: text(40), ctaHref: href, imageUrl: optUrl, productSlug: z.string().nullable(), bgColor: z.string(),
  }),
  trust: z.object({}),
  recently_viewed: z.object({}),
  reviews: z.object({ title: text(60), titleBn: text(80) }),
  newsletter: z.object({}),
};

export type SectionType = keyof typeof sectionSchemas;
export type SectionContent<T extends SectionType> = z.infer<(typeof sectionSchemas)[T]>;

export const SECTION_LABELS: Record<SectionType, string> = {
  hero: "Hero banner",
  edits: "Edit cards (I · II · III)",
  category_cards: "Category cards",
  featured_collections: "Featured collections",
  product_rail: "Product rail",
  club_national: "Clubs & national teams",
  personalise_promo: "Personalisation promo",
  tryon_promo: "AI Try-On promo",
  editorial_banner: "Editorial / promo banner",
  trust: "Trust & delivery",
  recently_viewed: "Recently viewed",
  reviews: "Customer reviews",
  newsletter: "Newsletter",
};

export function parseSection(type: string, content: unknown) {
  const schema = sectionSchemas[type as SectionType];
  if (!schema) return null;
  const r = schema.safeParse(content);
  return r.success ? r.data : null;
}

export const DEFAULT_SECTIONS: { type: SectionType; content: unknown }[] = [
  {
    type: "hero",
    content: {
      eyebrow: "New season 2026/27", eyebrowBn: "নতুন সিজন ২০২৬/২৭",
      headline: "Wear", headlineBn: "পরুন",
      headlineBold: "Your Kit", headlineBoldBn: "নিজের কিট",
      sub: "Club, country and custom jerseys, cut for the Bangladesh heat and delivered to your door.",
      subBn: "ক্লাব, দেশ ও কাস্টম জার্সি — বাংলাদেশের গরমের জন্য তৈরি, পৌঁছে যাবে আপনার দরজায়।",
      ctaLabel: "Shop Now", ctaLabelBn: "এখনই কিনুন", ctaHref: "/shop",
      secondaryLabel: "New Arrivals", secondaryLabelBn: "নতুন এসেছে", secondaryHref: "/shop?sort=newest",
      imageUrl: null, videoUrl: null,
      featuredProductSlugs: [
        "dhaka-riverside-26-27-home-jersey", "bangladesh-supporters-26-home-jersey", "argentina-supporters-26-home-jersey",
        "chattogram-mariners-26-27-home-jersey", "brazil-supporters-26-home-jersey", "khulna-tigers-26-27-home-jersey",
        "sylhet-tea-valley-26-27-home-jersey",
      ],
      bgColor: "#ffffff", tone: "light",
    },
  },
  { type: "trust", content: {} },
  {
    type: "edits",
    content: {
      eyebrow: "Shop the edit", eyebrowBn: "এডিট দেখুন",
      title: "Three Ways to Wear It", titleBn: "পরার তিনটি উপায়", href: "/shop",
      items: [
        { label: "Club", labelBn: "ক্লাব", href: "/shop?category=club-jerseys", productSlug: "old-town-athletic-26-27-home-jersey", imageUrl: null },
        { label: "Country", labelBn: "দেশ", href: "/shop?category=national-team-jerseys", productSlug: "germany-supporters-26-home-jersey", imageUrl: null },
        { label: "Custom", labelBn: "কাস্টম", href: "/collections/personalised", productSlug: "studio-custom-stripe-jersey", imageUrl: null },
      ],
    },
  },
  {
    type: "featured_collections",
    content: { eyebrow: "New arrivals", eyebrowBn: "নতুন এসেছে", title: "Fresh From the Studio", titleBn: "স্টুডিও থেকে নতুন", collectionSlugs: ["season-26-27"] },
  },
  {
    type: "category_cards",
    content: {
      eyebrow: "Find your style", eyebrowBn: "আপনার স্টাইল খুঁজুন",
      title: "Shop by Category", titleBn: "ক্যাটাগরি অনুযায়ী",
      items: [
        { label: "Club jerseys", labelBn: "ক্লাব জার্সি", href: "/shop?category=club-jerseys", productSlug: "rajshahi-mango-united-26-27-home-jersey", imageUrl: null, bgColor: "#ffffff" },
        { label: "National teams", labelBn: "জাতীয় দল", href: "/shop?category=national-team-jerseys", productSlug: "portugal-supporters-26-home-jersey", imageUrl: null, bgColor: "#ffffff" },
        { label: "Custom jerseys", labelBn: "কাস্টম জার্সি", href: "/shop?category=custom-jerseys", productSlug: "studio-custom-team-jersey", imageUrl: null, bgColor: "#ffffff" },
        { label: "Training kits", labelBn: "ট্রেনিং কিট", href: "/shop?category=training-kits", productSlug: "studio-pro-training-top", imageUrl: null, bgColor: "#ffffff" },
        { label: "Retro classics", labelBn: "রেট্রো", href: "/shop?category=retro", productSlug: "dhaka-riverside-1998-retro-jersey", imageUrl: null, bgColor: "#ffffff" },
        { label: "Fan collection", labelBn: "ফ্যান কালেকশন", href: "/shop?category=fan-collection", productSlug: "match-day-fan-tee-tigers", imageUrl: null, bgColor: "#ffffff" },
      ],
    },
  },
  {
    type: "product_rail",
    content: {
      eyebrow: "Just landed", eyebrowBn: "সবে এসেছে",
      title: "Newly Dropped Jerseys", titleBn: "নতুন আসা জার্সি",
      sub: "Fresh kits for the new season, built for match days and the Dhaka heat.",
      subBn: "নতুন সিজনের কিট — ম্যাচ ডে আর ঢাকার গরমের জন্য তৈরি।",
      align: "center", columns: 3, ctaLabel: "See More Jerseys", ctaLabelBn: "আরও জার্সি দেখুন",
      source: "new", collectionSlug: null, productSlugs: [], limit: 6, href: "/shop?sort=newest",
    },
  },
  {
    type: "editorial_banner",
    content: {
      eyebrow: "Special offer", eyebrowBn: "বিশেষ অফার",
      headline: "Up to {maxOff}% Off", headlineBn: "{maxOff}% পর্যন্ত ছাড়",
      body: "Limited-time prices on selected kits. Grab yours while sizes last.",
      bodyBn: "নির্বাচিত কিটে সীমিত সময়ের দাম। সাইজ থাকতে থাকতে সংগ্রহ করুন।",
      ctaLabel: "Shop the Sale", ctaLabelBn: "সেল দেখুন", ctaHref: "/shop?sale=1",
      imageUrl: null, productSlug: "bangladesh-1999-retro-supporters-jersey", bgColor: "#18181b",
    },
  },
  {
    type: "product_rail",
    content: {
      eyebrow: "Most popular", eyebrowBn: "সবচেয়ে জনপ্রিয়",
      title: "Best Sellers", titleBn: "বেস্ট সেলার",
      sub: "", subBn: "", align: "left", columns: 4, ctaLabel: "", ctaLabelBn: "",
      source: "best", collectionSlug: null, productSlugs: [], limit: 8, href: "/shop?sort=best",
    },
  },
  {
    type: "personalise_promo",
    content: {
      eyebrow: "Made for you", eyebrowBn: "আপনার জন্য তৈরি",
      headline: "Your name. Your number. In 3D.", headlineBn: "আপনার নাম। আপনার নম্বর। ৩ডি-তে।",
      body: "Design your shirt on our interactive 3D jersey. Pick a font, set your number and see it from every angle before you buy.",
      bodyBn: "আমাদের ইন্টারঅ্যাকটিভ ৩ডি জার্সিতে নিজের ডিজাইন করুন — ফন্ট বাছুন, নম্বর দিন এবং কেনার আগে সব দিক থেকে দেখুন।",
      ctaLabel: "Start personalising", ctaLabelBn: "পার্সোনালাইজ শুরু করুন", productSlug: "studio-custom-team-jersey", sampleName: "SAKIB", sampleNumber: "10",
    },
  },
  { type: "reviews", content: { title: "From Verified Buyers", titleBn: "যাচাইকৃত ক্রেতাদের মতামত" } },
  { type: "recently_viewed", content: {} },
];
