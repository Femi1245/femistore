import type { Metadata } from "next";
import { SocialMockups } from "@/components/marketing/SocialMockups";

export const metadata: Metadata = {
  title: "Social mockups — Zumelia",
  description: "Twitter/X mockup screens and captions for Zumelia marketing.",
  robots: { index: false, follow: false },
};

export default function MarketingMockupsPage() {
  return <SocialMockups />;
}
