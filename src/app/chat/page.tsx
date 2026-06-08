import { ChatApp } from "@/components/chat/ChatApp";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const user = await requireUser();
  return <ChatApp currentUser={user} />;
}
