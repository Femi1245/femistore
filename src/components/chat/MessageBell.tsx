"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { UnreadChatBadge } from "@/components/chat/UnreadChatBadge";
import { useUnreadChatCount } from "@/components/chat/useUnreadChatCount";

export function MessageBell({ userId }: { userId: string }) {
  const pathname = usePathname();
  const unread = useUnreadChatCount(userId);
  const active = pathname === "/chat" || pathname.startsWith("/chat");

  return (
    <Link
      href="/chat"
      className={`nav-icon-btn ${active ? "nav-icon-btn-active" : ""}`}
      aria-label={`Messages${unread ? `, ${unread} unread` : ""}`}
      title="Messages"
    >
      <MessageCircle className="h-[18px] w-[18px]" />
      <UnreadChatBadge count={unread} />
    </Link>
  );
}
