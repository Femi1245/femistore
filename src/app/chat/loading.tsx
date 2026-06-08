import { ChatSkeleton } from "@/components/skeletons/ChatSkeleton";
import { NavSkeleton } from "@/components/skeletons/NavSkeleton";

export default function ChatLoading() {
  return (
    <div className="vintage-page min-h-screen">
      <NavSkeleton />
      <ChatSkeleton />
    </div>
  );
}
