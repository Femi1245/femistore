/**
 * Single source of truth for X/Twitter mockup posts.
 * Update this file + SocialMockups.tsx UI whenever a user-facing feature ships.
 * Sync captions into ZUMELIA-TWITTER-PLAN.md (ongoing calendar).
 */

export const MARKETING_APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://itunes-mu.vercel.app";

export const MARKETING_MOCKUPS_PATH = "/marketing/mockups";

export const DEMO_PERSONAS = {
  seller: { name: "Amara Studio", handle: "@amarastudio_demo", role: "Beauty seller, Lagos" },
  buyer: { name: "James O.", handle: "@james_buyer_demo", role: "Customer" },
} as const;

export type MarketingMockupSlideId =
  | "seller-inbox"
  | "service-gig"
  | "auto-reply"
  | "storefront"
  | "calls"
  | "live";

export type MarketingMockupSlide = {
  id: MarketingMockupSlideId;
  title: string;
  feature: string;
  caption: string;
  hashtags: string;
  /** Suggested days in ZUMELIA-TWITTER-PLAN.md that use this mockup */
  planDayRefs?: string[];
  shippedAt?: string;
};

export const MARKETING_MOCKUP_SLIDES: MarketingMockupSlide[] = [
  {
    id: "seller-inbox",
    title: "Seller inbox (gig inquiries only)",
    feature: "Seller tab — gig inquiries separate from personal Chats",
    planDayRefs: ["Day 23", "Ongoing Mon"],
    shippedAt: "2026-06",
    caption: `Personal DMs and customer gig messages shouldn't live in the same inbox.

On Zumelia:
→ Chats = friends & personal
→ Seller = people who messaged your service listing

Built for real sellers. 🟠

Try it: ${MARKETING_APP_URL}`,
    hashtags: "#buildinpublic #smallbusiness #Zumelia",
  },
  {
    id: "service-gig",
    title: "Service gig → separate thread",
    feature: "Service gig listing + Message about this gig",
    planDayRefs: ["Day 24", "Ongoing Wed"],
    shippedAt: "2026-06",
    caption: `Someone sees your service on Zumelia and taps "Message about this gig."

That opens a dedicated gig thread — not your personal chat.

Business stays business. 🟠`,
    hashtags: "#gigeconomy #freelancer #Zumelia",
  },
  {
    id: "auto-reply",
    title: "Smart auto-reply for sellers",
    feature: "Seller auto-reply — schedule, limits, template/AI",
    planDayRefs: ["Ongoing Fri"],
    shippedAt: "2026-06",
    caption: `Sellers on Zumelia can auto-reply to gig inquiries:
✓ Your message (or AI-enhanced)
✓ Active hours only
✓ Once per chat (no spam)

First message gets a welcome. Follow-ups get you. 🟠`,
    hashtags: "#buildinpublic #automation #Zumelia",
  },
  {
    id: "storefront",
    title: "Business storefront",
    feature: "Business profile + storefront + gigs",
    planDayRefs: ["Day 25", "Ongoing Tue"],
    shippedAt: "2026-06",
    caption: `Your business on Zumelia isn't just a link in bio.

Storefront + service gigs + seller inbox + live — one profile, two modes (personal + business).

Who's listing their first gig this week? 👇`,
    hashtags: "#smallbusiness #socialcommerce #Zumelia",
  },
  {
    id: "calls",
    title: "Voice & video calls",
    feature: "In-chat voice/video calls",
    planDayRefs: ["Day 23 alt", "Ongoing Thu"],
    shippedAt: "2026-06",
    caption: `Text isn't always enough.

Zumelia: DMs, voice notes, and crystal-clear video calls — when the conversation actually matters. 🟠`,
    hashtags: "#buildinpublic #Zumelia",
  },
  {
    id: "live",
    title: "Go live with gifts",
    feature: "Live streaming + AR + gifts",
    planDayRefs: ["Day 24 alt", "Ongoing Sat"],
    shippedAt: "2026-06",
    caption: `Go live on Zumelia — AR lenses, co-hosts, real-time chat, and gifts.

Not another boring stream. A stage. 🟠`,
    hashtags: "#livestreaming #creators #Zumelia",
  },
];

export function fullMockupCaption(slide: MarketingMockupSlide): string {
  return `${slide.caption}\n\n${slide.hashtags}`;
}

export function getMockupById(id: MarketingMockupSlideId): MarketingMockupSlide | undefined {
  return MARKETING_MOCKUP_SLIDES.find((s) => s.id === id);
}

/** Features that need mockup slides when shipped (add UI + entry here). */
export const MOCKUP_BACKLOG: { feature: string; suggestedId: string }[] = [
  { feature: "Connect / mutual friends", suggestedId: "connect" },
  { feature: "Secret chats", suggestedId: "secret-chat" },
  { feature: "Opportunities / jobs board", suggestedId: "opportunities" },
  { feature: "Gifts in chat", suggestedId: "gifts" },
  { feature: "Continue with X sign-in", suggestedId: "x-oauth" },
];
