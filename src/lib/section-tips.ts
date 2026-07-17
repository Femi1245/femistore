import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Briefcase,
  Clapperboard,
  MessageCircle,
  Newspaper,
  Radio,
  UserRound,
} from "lucide-react";

export type SectionTipId =
  | "feed"
  | "chat"
  | "live"
  | "watch"
  | "opportunities"
  | "profile"
  | "notifications";

export type SectionTip = {
  id: SectionTipId;
  title: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
  icon: LucideIcon;
};

const STORAGE_PREFIX = "zumelia-section-tip-dismissed:";

export function sectionTipStorageKey(id: SectionTipId): string {
  return `${STORAGE_PREFIX}${id}`;
}

export const SECTION_TIPS: Record<SectionTipId, SectionTip> = {
  feed: {
    id: "feed",
    title: "Your circle, your feed",
    body: "Switch Friends, Close, or Following to control who you see. Connect with people in Chat → Discover so your feed fills up.",
    ctaLabel: "Discover people",
    ctaHref: "/chat",
    icon: Newspaper,
  },
  chat: {
    id: "chat",
    title: "Messages & discover",
    body: "DMs, groups, channels, and secret chats live here. Use the Discover tab to find people and send connection requests.",
    icon: MessageCircle,
  },
  live: {
    id: "live",
    title: "Go live or drop in",
    body: "Watch video streams or join a voice lounge. Tap Go live to broadcast — gifts and co-hosts are built in.",
    ctaLabel: "Go live",
    ctaHref: "/live/go-live",
    icon: Radio,
  },
  watch: {
    id: "watch",
    title: "Long-form video",
    body: "Search, save playlists, and upload your own clips from the Upload tab. Use History to pick up where you left off.",
    icon: Clapperboard,
  },
  opportunities: {
    id: "opportunities",
    title: "Hire, sell, or find work",
    body: "Browse gigs and hiring posts. List a service from a business profile, or post what you need hired.",
    ctaLabel: "List a service",
    ctaHref: "/opportunities/new/service",
    icon: Briefcase,
  },
  profile: {
    id: "profile",
    title: "Your home on Zumelia",
    body: "Edit your profile, post updates, and tap Analytics on each of your posts to see views and engagement.",
    ctaLabel: "Edit profile",
    ctaHref: "/profile/edit",
    icon: UserRound,
  },
  notifications: {
    id: "notifications",
    title: "Stay in the loop",
    body: "Likes, comments, lives, messages, and connection requests land here. Tap an avatar to open their profile.",
    ctaLabel: "Go to feed",
    ctaHref: "/feed",
    icon: Bell,
  },
};
