import { AppShell } from "@/components/layout/AppShell";
import { StartVoiceRoomForm } from "@/components/voice/StartVoiceRoomForm";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Start voice lounge — Zumelia",
};

export default async function StartVoicePage() {
  const user = await requireUser();

  return (
    <AppShell user={user} wide>
      <StartVoiceRoomForm />
    </AppShell>
  );
}
