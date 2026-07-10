import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { BackButton } from "@/components/layout/BackButton";
import { VoiceRoomView } from "@/components/voice/VoiceRoomView";
import { loadVoiceRoomByName } from "@/lib/voice-rooms";
import { requireUser } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ room: string }> };

export default async function VoiceRoomPage({ params }: Props) {
  const user = await requireUser();
  const { room: roomName } = await params;
  const decoded = decodeURIComponent(roomName);
  const supabase = await createClient();
  const room = await loadVoiceRoomByName(supabase, decoded);

  if (!room || !room.is_active) {
    notFound();
  }

  return (
    <AppShell user={user} wide>
      <BackButton
        fallbackHref="/live?tab=voice"
        label="All lounges"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-vintage-ink-muted hover:text-vintage-rust"
      />
      <VoiceRoomView roomName={decoded} room={room} currentUser={user} />
    </AppShell>
  );
}
