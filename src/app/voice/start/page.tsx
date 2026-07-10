import { AppShell } from "@/components/layout/AppShell";
import { BackButton } from "@/components/layout/BackButton";
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
      <div className="space-y-4">
        <BackButton
          fallbackHref="/live?tab=voice"
          label="Back to lounges"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-vintage-rust hover:underline"
        />
        <StartVoiceRoomForm />
      </div>
    </AppShell>
  );
}
