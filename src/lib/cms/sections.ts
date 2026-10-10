import { z } from "zod";

const href = z.string().max(200);
const text = (max = 200) => z.string().max(max);
const optUrl = z.string().max(500).nullable();

export const sectionSchemas = {
  hero: z.object({
    eyebrow: text(60), eyebrowBn: text(60),
    headline: text(90), headlineBn: text(120),
    sub: text(220), subBn: text(260),
    ctaLabel: text(30), ctaLabelBn: text(40), ctaHref: href,
    secondaryLabel: text(30), secondaryLabelBn: text(40), secondaryHref: href,
    imageUrl: optUrl,
    videoUrl: optUrl,
    featuredProductSlugs: z.array(z.string()).max(3),
    bgColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    tone: z.enum(["dark", "light"]),
  }),
  category_cards: z.object({
    title: text(60), titleBn: text(80),
    items: z.array(z.object({ label: text(40), labelBn: text(60), href, productSlug: z.string().nullable(), imageUrl: optUrl, bgColor: z.string() })).max(6),
  }),
  featured_collections: z.object({ title: text(60), titleBn: text(80), collectionSlugs: z.array(z.string()).max(6) }),
  product_rail: z.object({
    title: text(60), titleBn: text(80),
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
      eyebrow: "Season 26/27 · Now in store", eyebrowBn: "সিজন ২৬/২৭ · এখন স্টোরে",
      headline: "Wear the game you love.", headlineBn: "যে খেলা ভালোবাসেন, তা-ই পরুন।",
      sub: "Premium club, country and personalised jerseys — cut for the Bangladesh heat, delivered to your door.",
      subBn: "প্রিমিয়াম ক্লাব, দেশ ও পার্সোনালাইজড জার্সি — বাংলাদেশের গরমের জন্য তৈরি, পৌঁছে যাবে আপনার দরজায়।",
      ctaLabel: "Shop jerseys", ctaLabelBn: "জার্সি কিনুন", ctaHref: "/shop",
      secondaryLabel: "Personalise yours", secondaryLabelBn: "নিজের মতো করুন", secondaryHref: "/collections/personalised",
      imageUrl: null, videoUrl: null,
      featuredProductSlugs: ["dhaka-riverside-26-27-home-jersey", "bangladesh-supporters-26-home-jersey", "chattogram-mariners-26-27-away-jersey"],
      bgColor: "#10231b", tone: "dark",
    },
  },
  {
    type: "category_cards",
    content: {
      title: "Shop by category", titleBn: "ক্যাটাগরি অনুযায়ী",
      items: [
        { label: "Club jerseys", labelBn: "ক্লাব জার্সি", href: "/shop?category=club-jerseys", productSlug: "sylhet-tea-valley-26-27-home-jersey", imageUrl: null, bgColor: "#e6ece4" },
        { label: "National teams", labelBn: "জাতীয় দল", href: "/shop?category=national-team-jerseys", productSlug: "argentina-supporters-26-home-jersey", imageUrl: null, bgColor: "#e5ebf2" },
        { label: "Personalised", labelBn: "পার্সোনালাইজড", href: "/collections/personalised", productSlug: "studio-custom-team-jersey", imageUrl: null, bgColor: "#efe7e2" },
        { label: "Training", labelBn: "ট্রেনিং", href: "/shop?category=training-kits", productSlug: "studio-pro-training-top", imageUrl: null, bgColor: "#e9e7ef" },
      ],
    },
  },
  {
    type: "product_rail",
    content: { title: "Best sellers", titleBn: "বেস্ট সেলার", source: "best", collectionSlug: null, productSlugs: [], limit: 8, href: "/shop?sort=best" },
  },
  {
    type: "featured_collections",
    content: { title: "Featured collections", titleBn: "ফিচার্ড কালেকশন", collectionSlugs: ["season-26-27", "retro-classics", "fan-favourites"] },
  },
  {
    type: "personalise_promo",
    content: {
      eyebrow: "Made for you", eyebrowBn: "আপনার জন্য তৈরি",
      headline: "Your name. Your number. In 3D.", headlineBn: "আপনার নাম। আপনার নম্বর। ৩ডি-তে।",
      body: "Design your shirt on our interactive 3D jersey — pick a font, set your number and see it from every angle before you buy.",
      bodyBn: "আমাদের ইন্টারঅ্যাকটিভ ৩ডি জার্সিতে নিজের ডিজাইন করুন — ফন্ট বাছুন, নম্বর দিন এবং কেনার আগে সব দিক থেকে দেখুন।",
      ctaLabel: "Start personalising", ctaLabelBn: "পার্সোনালাইজ শুরু করুন", productSlug: "studio-custom-team-jersey", sampleName: "SAKIB", sampleNumber: "10",
    },
  },
  {
    type: "product_rail",
    content: { title: "New arrivals", titleBn: "নতুন এসেছে", source: "new", collectionSlug: null, productSlugs: [], limit: 8, href: "/shop?sort=newest" },
  },
  { type: "club_national", content: { title: "Club & country", titleBn: "ক্লাব ও দেশ" } },
  {
    type: "tryon_promo",
    content: {
      eyebrow: "New · AI Virtual Try-On", eyebrowBn: "নতুন · এআই ভার্চুয়াল ট্রাই-অন",
      headline: "See it on you before it ships.", headlineBn: "পাঠানোর আগেই নিজের গায়ে দেখুন।",
      body: "Upload a photo and our AI creates a preview of you in the jersey. Your photo stays private and is deleted automatically.",
      bodyBn: "একটি ছবি আপলোড করুন, আমাদের এআই জার্সিতে আপনার একটি প্রিভিউ তৈরি করবে। আপনার ছবি গোপন থাকে এবং স্বয়ংক্রিয়ভাবে মুছে যায়।",
      ctaLabel: "Try a jersey on", ctaLabelBn: "জার্সি ট্রাই করুন",
    },
  },
  { type: "trust", content: {} },
  { type: "reviews", content: { title: "From verified buyers", titleBn: "যাচাইকৃত ক্রেতাদের মতামত" } },
  { type: "recently_viewed", content: {} },
  { type: "newsletter", content: {} },
];
