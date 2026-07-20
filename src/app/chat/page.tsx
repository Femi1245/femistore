import nextDynamic from "next/dynamic";
import { Suspense } from "react";
import { ChatSkeleton } from "@/components/skeletons/ChatSkeleton";
import { NavSkeleton } from "@/components/skeletons/NavSkeleton";
import { loadAllConversations } from "@/lib/chat";
import { loadChatFolders } from "@/lib/chat-folders";
import { requireUser } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ChatApp = nextDynamic(
  () => import("@/components/chat/ChatApp").then((m) => m.ChatApp),
  {
    loading: () => (
      <div className="vintage-page min-h-screen">
        <NavSkeleton />
        <ChatSkeleton />
      </div>
    ),
  },
);

export default async function ChatPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [initialConversations, initialChatFolders] = await Promise.all([
    loadAllConversations(supabase, user.id),
    loadChatFolders(supabase, user.id),
  ]);

  return (
    <Suspense
      fallback={
        <div className="vintage-page min-h-screen">
          <NavSkeleton />
          <ChatSkeleton />
        </div>
      }
    >
      <ChatApp
        currentUser={user}
        initialConversations={initialConversations}
        initialChatFolders={initialChatFolders}
      />
    </Suspense>
  );
}
