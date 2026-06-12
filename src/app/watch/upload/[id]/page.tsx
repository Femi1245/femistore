import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Radio } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { AddToPlaylistButton } from "@/components/watch/AddToPlaylistButton";
import { NativeVideoPlayer } from "@/components/watch/NativeVideoPlayer";
import { WatchRecorder } from "@/components/watch/WatchRecorder";
import { requireUser } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { getUserVideo } from "@/lib/watch";

export const dynamic = "force-dynamic";

export default async function WatchUploadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const supabase = await createClient();
  const video = await getUserVideo(supabase, id);

  if (!video?.video_url) notFound();

  const watchVideo = {
    videoKey: video.id,
    source: "upload" as const,
    title: video.title,
    channelTitle: "Zumelia Upload",
    thumbnailUrl: video.thumbnail_url,
    videoUrl: video.video_url,
  };

  return (
    <AppShell user={user} wide>
      <WatchRecorder userId={user.id} video={watchVideo} />

      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/watch"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-vintage-ink-muted hover:text-vintage-rust"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to library
          </Link>
          <AddToPlaylistButton userId={user.id} video={watchVideo} />
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-vintage-rust">
          <Radio className="h-3.5 w-3.5" />
          Now playing on Zumelia
        </div>

        <NativeVideoPlayer
          src={video.video_url}
          title={video.title}
          channelTitle="Uploaded on Zumelia"
          poster={video.thumbnail_url}
        />

        <div className="vintage-card p-5">
          <h1 className="font-display text-2xl font-bold leading-snug text-vintage-ink">
            {video.title}
          </h1>
          {video.description && (
            <p className="mt-2 text-sm text-vintage-ink-muted">{video.description}</p>
          )}
          <p className="mt-3 text-xs uppercase tracking-wide text-vintage-ink-muted/80">
            Hosted on Zumelia Watch
          </p>
        </div>
      </div>
    </AppShell>
  );
}
