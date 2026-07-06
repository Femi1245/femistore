import nextDynamic from "next/dynamic";
import { ChatSkeleton } from "@/components/skeletons/ChatSkeleton";
import { NavSkeleton } from "@/components/skeletons/NavSkeleton";
import { requireUser } from "@/lib/session";

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
  return <ChatApp currentUser={user} />;
}
