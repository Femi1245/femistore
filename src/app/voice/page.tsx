import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { VoiceRoomList } from "@/components/voice/VoiceRoomList";
import { LiveSetupNotice } from "@/components/live/LiveSetupNotice";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Voice lounges — Zumelia",
  description: "Audio-only hangouts — talk without camera pressure.",
};

export default async function VoicePage() {
  const user = await requireUser();

  return (
    <AppShell user={user} wide>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-vintage-ink">Voice lounges</h1>
            <p className="text-sm text-vintage-ink-muted">
              Soft socializing — hang out with audio only, no camera required.
            </p>
          </div>
          <Link href="/voice/start" className="vintage-btn px-5 py-2.5 text-sm">
            Start lounge
          </Link>
        </div>
        <LiveSetupNotice />
        <VoiceRoomList />
      </div>
    </AppShell>
  );
}
