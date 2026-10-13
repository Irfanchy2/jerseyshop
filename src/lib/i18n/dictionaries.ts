/** UI strings. Product/CMS content carries its own `*Bn` fields. */
export const en = {
  nav: {
    home: "Home", newArrivals: "New arrivals", sale: "Sale", theme: "Toggle dark mode", languageEn: "English", languageBn: "বাংলা",
    shop: "Shop", collections: "Collections", clubs: "Clubs", national: "National Teams", custom: "Personalise",
    tryOn: "Virtual Try-On", training: "Training", newIn: "New In", search: "Search", account: "Account",
    wishlist: "Wishlist", cart: "Bag", menu: "Menu", close: "Close", trackOrder: "Track order", signIn: "Sign in",
  },
  home: {
    shopJerseys: "Shop jerseys", exploreCollections: "Explore collections", featuredCollections: "Featured collections",
    bestSellers: "Best sellers", newArrivals: "New arrivals", viewAll: "View all", clubAndCountry: "Club & country",
    clubs: "Clubs", nationalTeams: "National teams", recentlyViewed: "Recently viewed", reviews: "From verified buyers",
    newsletterTitle: "Get first access to new drops", newsletterBody: "Kit launches, restocks and members-only offers. No spam.",
    emailPlaceholder: "Email address", subscribe: "Subscribe", subscribed: "You're on the list. Thank you!",
  },
  product: {
    addToCart: "Add to bag", buyNow: "Buy now", selectSize: "Select a size", sizeGuide: "Size guide", outOfStock: "Out of stock",
    lowStock: "Only {n} left in this size", inStock: "In stock", quantity: "Quantity", color: "Colour", size: "Size",
    fabricCare: "Fabric & care", delivery: "Delivery", returns: "Returns", details: "Details", tryOn: "Try it on virtually",
    customize: "Add name & number", related: "You may also like", reviews: "Reviews", noReviews: "No reviews yet.",
    verifiedBuyer: "Verified buyer", saveWishlist: "Save", saved: "Saved", sale: "Sale", new: "New",
    front: "Front", back: "Back", view3d: "3D view", added: "Added to your bag", quickView: "Quick view", quickAdd: "Quick add",
    writeReview: "Write a review", personalisedFrom: "Personalisation from",
  },
  shop: {
    title: "All jerseys", filters: "Filters", sort: "Sort", clear: "Clear all", results: "{n} products", category: "Category",
    team: "Team", season: "Season", color: "Colour", size: "Size", price: "Price", availability: "Availability",
    inStockOnly: "In stock only", apply: "Show results", noResults: "No jerseys match these filters.",
    sortFeatured: "Featured", sortNewest: "Newest", sortPriceAsc: "Price: low to high", sortPriceDesc: "Price: high to low",
    sortBest: "Best selling", loadMore: "Load more", kitType: "Kit",
  },
  cart: {
    title: "Your bag", empty: "Your bag is empty.", continue: "Continue shopping", subtotal: "Subtotal", checkout: "Checkout",
    remove: "Remove", shippingNote: "Shipping and discounts calculated at checkout.", personalised: "Personalised",
    freeShippingProgress: "Add {amount} more for free delivery", freeShippingUnlocked: "You've unlocked free delivery",
  },
  checkout: {
    title: "Checkout", contact: "Contact", delivery: "Delivery address", shippingMethod: "Delivery method", payment: "Payment",
    placeOrder: "Place order", name: "Full name", phone: "Mobile number", altPhone: "Alternative number (optional)",
    email: "Email (optional)", address: "House, road, area details", area: "Area / Thana", district: "District",
    division: "Division", postcode: "Postcode (optional)", notes: "Order notes (optional)", cod: "Cash on Delivery",
    codBody: "Pay in cash when your order arrives.", online: "Pay online (cards, bKash, Nagad via SSLCommerz)",
    coupon: "Discount code", applyCoupon: "Apply", summary: "Order summary", discount: "Discount", shipping: "Delivery",
    total: "Total", customization: "Personalisation", placing: "Placing order…", free: "Free",
    successTitle: "Thank you — your order is placed", successBody: "We'll call or SMS you to confirm before dispatch.",
    orderNumber: "Order number", trackOrder: "Track this order",
  },
  account: {
    title: "My account", orders: "Orders", wishlist: "Wishlist", addresses: "Addresses", designs: "Saved designs",
    tryOns: "Try-on images", profile: "Profile", signOut: "Sign out", login: "Sign in", register: "Create account",
    password: "Password", forgot: "Forgot password?", noOrders: "You haven't placed any orders yet.", privacy: "Privacy & data",
  },
  tryon: {
    title: "Virtual Try-On", subtitle: "See how a jersey could look on you with an AI-generated preview.",
    upload: "Upload your photo", drop: "Drag & drop a photo, or browse", replace: "Replace", remove: "Remove",
    useModel: "Use a sample model instead", tips: "For best results", generate: "Generate try-on", generating: "Generating your preview…",
    consent: "I agree that my photo will be processed by our AI provider to create this preview, stored privately and deleted automatically.",
    aiLabel: "AI-generated preview — not an exact representation of fit, size or fabric.",
    demoMode: "Demo mode: the AI provider is not configured, so no real try-on image can be generated.",
    regenerate: "Regenerate", download: "Download", compare: "Compare", original: "Original", result: "Try-on",
    deleteNow: "Delete my images now", step: "Step",
  },
  common: {
    loading: "Loading…", save: "Save", cancel: "Cancel", back: "Back", error: "Something went wrong.", retry: "Try again",
    language: "Language", currency: "BDT", required: "Required",
  },
  footer: {
    shop: "Shop", help: "Help", company: "Company", contact: "Contact us", faq: "FAQ", shipping: "Shipping policy",
    returns: "Return policy", privacy: "Privacy policy", terms: "Terms", about: "About", rights: "All rights reserved.",
    payments: "Cash on Delivery · Cards · bKash · Nagad",
  },
  fitting: {
    title: "Fitting room", hint: "Tap the hanger on any jersey to wear it.", tryAi: "Try on with AI", startOver: "Start over",
    browse: "Browse jerseys", aiLink: "AI try-on", open: "Open the fitting room", pill: "Try it on",
    disclaimer: "Quick preview on a dress form, not AI-generated. Use AI try-on to see it on you.",
  },
  trust: {
    cod: "Cash on delivery", codBody: "Pay when it arrives, anywhere in Bangladesh.",
    delivery: "Fast delivery", deliveryBody: "1–2 days in Dhaka, 2–4 days nationwide.",
    returns: "Easy returns", returnsBody: "7-day size exchanges on non-personalised kits.",
    quality: "Premium fabric", qualityBody: "Breathable, quick-dry performance knit.",
    codShort: "Pay when it arrives", deliveryShort: "1–2 days inside Dhaka", returnsShort: "7-day size exchange", qualityShort: "Quick-dry performance knit",
  },
};

export type Dictionary = typeof en;

export const bn: Dictionary = {
  nav: {
    home: "হোম", newArrivals: "নতুন এসেছে", sale: "সেল", theme: "ডার্ক মোড পরিবর্তন", languageEn: "English", languageBn: "বাংলা",
    shop: "শপ", collections: "কালেকশন", clubs: "ক্লাব", national: "জাতীয় দল", custom: "পার্সোনালাইজ",
    tryOn: "ভার্চুয়াল ট্রাই-অন", training: "ট্রেনিং", newIn: "নতুন", search: "খুঁজুন", account: "অ্যাকাউন্ট",
    wishlist: "উইশলিস্ট", cart: "ব্যাগ", menu: "মেনু", close: "বন্ধ", trackOrder: "অর্ডার ট্র্যাক", signIn: "সাইন ইন",
  },
  home: {
    shopJerseys: "জার্সি কিনুন", exploreCollections: "কালেকশন দেখুন", featuredCollections: "ফিচার্ড কালেকশন",
    bestSellers: "বেস্ট সেলার", newArrivals: "নতুন এসেছে", viewAll: "সব দেখুন", clubAndCountry: "ক্লাব ও দেশ",
    clubs: "ক্লাব", nationalTeams: "জাতীয় দল", recentlyViewed: "সম্প্রতি দেখা", reviews: "যাচাইকৃত ক্রেতাদের মতামত",
    newsletterTitle: "নতুন কালেকশনের খবর সবার আগে", newsletterBody: "নতুন কিট, রিস্টক ও বিশেষ অফার। কোনো স্প্যাম নয়।",
    emailPlaceholder: "ইমেইল ঠিকানা", subscribe: "সাবস্ক্রাইব", subscribed: "ধন্যবাদ! আপনি তালিকায় যুক্ত হয়েছেন।",
  },
  product: {
    addToCart: "ব্যাগে যোগ করুন", buyNow: "এখনই কিনুন", selectSize: "সাইজ নির্বাচন করুন", sizeGuide: "সাইজ গাইড",
    outOfStock: "স্টকে নেই", lowStock: "এই সাইজে মাত্র {n}টি বাকি", inStock: "স্টকে আছে", quantity: "পরিমাণ",
    color: "রং", size: "সাইজ", fabricCare: "কাপড় ও যত্ন", delivery: "ডেলিভারি", returns: "রিটার্ন", details: "বিস্তারিত",
    tryOn: "ভার্চুয়ালি ট্রাই করুন", customize: "নাম ও নম্বর যোগ করুন", related: "আপনার পছন্দ হতে পারে",
    reviews: "রিভিউ", noReviews: "এখনো কোনো রিভিউ নেই।", verifiedBuyer: "যাচাইকৃত ক্রেতা", saveWishlist: "সেভ",
    saved: "সেভ করা", sale: "সেল", new: "নতুন", front: "সামনে", back: "পেছনে", view3d: "৩ডি ভিউ",
    added: "ব্যাগে যোগ হয়েছে", quickView: "দ্রুত দেখুন", quickAdd: "দ্রুত যোগ", writeReview: "রিভিউ লিখুন",
    personalisedFrom: "পার্সোনালাইজেশন",
  },
  shop: {
    title: "সব জার্সি", filters: "ফিল্টার", sort: "সাজান", clear: "সব মুছুন", results: "{n}টি পণ্য", category: "ক্যাটাগরি",
    team: "দল", season: "সিজন", color: "রং", size: "সাইজ", price: "দাম", availability: "প্রাপ্যতা",
    inStockOnly: "শুধু স্টকে থাকা", apply: "ফলাফল দেখুন", noResults: "এই ফিল্টারে কোনো জার্সি পাওয়া যায়নি।",
    sortFeatured: "ফিচার্ড", sortNewest: "নতুন", sortPriceAsc: "দাম: কম থেকে বেশি", sortPriceDesc: "দাম: বেশি থেকে কম",
    sortBest: "বেস্ট সেলিং", loadMore: "আরও দেখুন", kitType: "কিট",
  },
  cart: {
    title: "আপনার ব্যাগ", empty: "আপনার ব্যাগ খালি।", continue: "কেনাকাটা চালিয়ে যান", subtotal: "সাবটোটাল",
    checkout: "চেকআউট", remove: "সরান", shippingNote: "ডেলিভারি চার্জ ও ডিসকাউন্ট চেকআউটে হিসাব হবে।",
    personalised: "পার্সোনালাইজড", freeShippingProgress: "ফ্রি ডেলিভারির জন্য আরও {amount}",
    freeShippingUnlocked: "আপনি ফ্রি ডেলিভারি পাচ্ছেন",
  },
  checkout: {
    title: "চেকআউট", contact: "যোগাযোগ", delivery: "ডেলিভারি ঠিকানা", shippingMethod: "ডেলিভারি পদ্ধতি", payment: "পেমেন্ট",
    placeOrder: "অর্ডার করুন", name: "পূর্ণ নাম", phone: "মোবাইল নম্বর", altPhone: "বিকল্প নম্বর (ঐচ্ছিক)",
    email: "ইমেইল (ঐচ্ছিক)", address: "বাসা, রোড, এলাকার বিবরণ", area: "এলাকা / থানা", district: "জেলা",
    division: "বিভাগ", postcode: "পোস্টকোড (ঐচ্ছিক)", notes: "অর্ডার নোট (ঐচ্ছিক)", cod: "ক্যাশ অন ডেলিভারি",
    codBody: "পণ্য হাতে পেয়ে নগদ টাকা পরিশোধ করুন।", online: "অনলাইনে পেমেন্ট (কার্ড, বিকাশ, নগদ — SSLCommerz)",
    coupon: "ডিসকাউন্ট কোড", applyCoupon: "প্রয়োগ", summary: "অর্ডার সারাংশ", discount: "ডিসকাউন্ট", shipping: "ডেলিভারি",
    total: "মোট", customization: "পার্সোনালাইজেশন", placing: "অর্ডার হচ্ছে…", free: "ফ্রি",
    successTitle: "ধন্যবাদ — আপনার অর্ডার সম্পন্ন হয়েছে", successBody: "পাঠানোর আগে আমরা কল বা SMS করে নিশ্চিত করব।",
    orderNumber: "অর্ডার নম্বর", trackOrder: "অর্ডার ট্র্যাক করুন",
  },
  account: {
    title: "আমার অ্যাকাউন্ট", orders: "অর্ডার", wishlist: "উইশলিস্ট", addresses: "ঠিকানা", designs: "সেভ করা ডিজাইন",
    tryOns: "ট্রাই-অন ছবি", profile: "প্রোফাইল", signOut: "সাইন আউট", login: "সাইন ইন", register: "অ্যাকাউন্ট খুলুন",
    password: "পাসওয়ার্ড", forgot: "পাসওয়ার্ড ভুলে গেছেন?", noOrders: "আপনি এখনো কোনো অর্ডার করেননি।", privacy: "প্রাইভেসি ও ডেটা",
  },
  tryon: {
    title: "ভার্চুয়াল ট্রাই-অন", subtitle: "এআই-তৈরি প্রিভিউতে দেখুন জার্সিটি আপনাকে কেমন মানাতে পারে।",
    upload: "আপনার ছবি আপলোড করুন", drop: "ছবি টেনে আনুন বা ব্রাউজ করুন", replace: "পরিবর্তন", remove: "সরান",
    useModel: "নমুনা মডেল ব্যবহার করুন", tips: "সেরা ফলাফলের জন্য", generate: "ট্রাই-অন তৈরি করুন",
    generating: "আপনার প্রিভিউ তৈরি হচ্ছে…",
    consent: "আমি সম্মত যে এই প্রিভিউ তৈরির জন্য আমার ছবি এআই সেবাদাতা প্রসেস করবে, গোপনে সংরক্ষিত থাকবে এবং স্বয়ংক্রিয়ভাবে মুছে যাবে।",
    aiLabel: "এআই-তৈরি প্রিভিউ — ফিট, সাইজ বা কাপড়ের হুবহু উপস্থাপন নয়।",
    demoMode: "ডেমো মোড: এআই সেবা কনফিগার করা হয়নি, তাই বাস্তব ট্রাই-অন ছবি তৈরি করা যাবে না।",
    regenerate: "আবার তৈরি করুন", download: "ডাউনলোড", compare: "তুলনা", original: "মূল ছবি", result: "ট্রাই-অন",
    deleteNow: "এখনই আমার ছবি মুছুন", step: "ধাপ",
  },
  common: {
    loading: "লোড হচ্ছে…", save: "সেভ", cancel: "বাতিল", back: "পেছনে", error: "কিছু ভুল হয়েছে।", retry: "আবার চেষ্টা করুন",
    language: "ভাষা", currency: "টাকা", required: "আবশ্যক",
  },
  footer: {
    shop: "শপ", help: "সহায়তা", company: "প্রতিষ্ঠান", contact: "যোগাযোগ", faq: "প্রশ্নোত্তর", shipping: "ডেলিভারি নীতি",
    returns: "রিটার্ন নীতি", privacy: "গোপনীয়তা নীতি", terms: "শর্তাবলি", about: "আমাদের সম্পর্কে", rights: "সর্বস্বত্ব সংরক্ষিত।",
    payments: "ক্যাশ অন ডেলিভারি · কার্ড · বিকাশ · নগদ",
  },
  fitting: {
    title: "ফিটিং রুম", hint: "যেকোনো জার্সির হ্যাঙ্গারে ট্যাপ করে পরিয়ে দেখুন।", tryAi: "এআই দিয়ে ট্রাই করুন", startOver: "আবার শুরু",
    browse: "জার্সি দেখুন", aiLink: "এআই ট্রাই-অন", open: "ফিটিং রুম খুলুন", pill: "ট্রাই করুন",
    disclaimer: "ড্রেস ফর্মে দ্রুত প্রিভিউ, এআই-তৈরি নয়। নিজের গায়ে দেখতে এআই ট্রাই-অন ব্যবহার করুন।",
  },
  trust: {
    codShort: "হাতে পেয়ে মূল্য পরিশোধ", deliveryShort: "ঢাকায় ১–২ দিনে", returnsShort: "৭ দিনের সাইজ এক্সচেঞ্জ", qualityShort: "কুইক-ড্রাই পারফরম্যান্স নিট",
    cod: "ক্যাশ অন ডেলিভারি", codBody: "সারা বাংলাদেশে পণ্য হাতে পেয়ে মূল্য পরিশোধ।",
    delivery: "দ্রুত ডেলিভারি", deliveryBody: "ঢাকায় ১–২ দিন, সারা দেশে ২–৪ দিন।",
    returns: "সহজ রিটার্ন", returnsBody: "নন-পার্সোনালাইজড কিটে ৭ দিনের সাইজ এক্সচেঞ্জ।",
    quality: "প্রিমিয়াম কাপড়", qualityBody: "শ্বাস-প্রশ্বাসযোগ্য, দ্রুত শুকানো পারফরম্যান্স নিট।",
  },
};

export const dictionaries = { en, bn };
export type Locale = keyof typeof dictionaries;
export const LOCALES: Locale[] = ["en", "bn"];
