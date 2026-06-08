import { notFound } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { LiveRoom } from "@/components/live/LiveRoom";
import { requireUser } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { LiveStream } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LiveRoomPage({
  params,
}: {
  params: Promise<{ room: string }>;
}) {
  const { room } = await params;
  const currentUser = await requireUser();
  const supabase = await createClient();

  const { data: stream } = await supabase
    .from("live_streams")
    .select("*")
    .eq("room_name", room)
    .maybeSingle();

  if (!stream) notFound();

  return (
    <AppShell user={currentUser}>
      <Link
        href="/live"
        className="mb-4 inline-block text-sm font-medium text-vintage-rust hover:underline"
      >
        ← All live streams
      </Link>
      <LiveRoom
        roomName={room}
        stream={stream as LiveStream}
        currentUser={currentUser}
      />
    </AppShell>
  );
}
