import {
  Gamepad2,
  MessageCircle,
  Music2,
  Radio,
  ShoppingBag,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { LiveCategory } from "@/lib/types";

export type { LiveCategory } from "@/lib/types";

export const LIVE_CATEGORY_IDS = [
  "video",
  "gaming",
  "music",
  "talk",
  "events",
  "shopping",
] as const;

export type LiveCategoryOption = {
  id: LiveCategory;
  label: string;
  description: string;
  icon: LucideIcon;
};

export const LIVE_CATEGORIES: LiveCategoryOption[] = [
  {
    id: "video",
    label: "Video",
    description: "Everyday moments, creators and behind the scenes",
    icon: Radio,
  },
  {
    id: "gaming",
    label: "Gaming",
    description: "Share your screen for real gameplay streams",
    icon: Gamepad2,
  },
  {
    id: "music",
    label: "Music",
    description: "Performances, DJ sets — camera or screen share",
    icon: Music2,
  },
  {
    id: "talk",
    label: "Talk",
    description: "Conversations, interviews and Q&A",
    icon: MessageCircle,
  },
  {
    id: "events",
    label: "Events",
    description: "Shows and launches — stream stage or screen",
    icon: Sparkles,
  },
  {
    id: "shopping",
    label: "Shopping",
    description: "Product demos, drops and live selling",
    icon: ShoppingBag,
  },
];

export function isLiveCategory(value: unknown): value is LiveCategory {
  return (
    typeof value === "string" &&
    LIVE_CATEGORY_IDS.includes(value as LiveCategory)
  );
}

export function getLiveCategory(category: LiveCategory) {
  return LIVE_CATEGORIES.find((item) => item.id === category)!;
}
