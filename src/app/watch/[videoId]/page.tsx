import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Radio } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { AddToPlaylistButton } from "@/components/watch/AddToPlaylistButton";
import { SiteVideoPlayer } from "@/components/watch/VideoPlayer";
import { WatchRecorder } from "@/components/watch/WatchRecorder";
import { requireUser } from "@/lib/session";
import { fetchVideoDetails, parseYouTubeVideoId } from "@/lib/youtube";

export const dynamic = "force-dynamic";

export default async function WatchVideoPage({
  params,
}: {
  params: Promise<{ videoId: string }>;
}) {
  const user = await requireUser();
  const { videoId: rawId } = await params;
  const videoId = parseYouTubeVideoId(rawId);

  if (!videoId) notFound();

  const details = await fetchVideoDetails(videoId);
  const watchVideo = {
    videoKey: videoId,
    source: "stream" as const,
    title: details?.title ?? "Untitled video",
    channelTitle: details?.channelTitle ?? null,
    thumbnailUrl: details?.thumbnailUrl ?? null,
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
          Now playing on iTunes
        </div>

        <SiteVideoPlayer
          videoId={videoId}
          title={details?.title}
          channelTitle={details?.channelTitle}
          thumbnailUrl={details?.thumbnailUrl}
        />

        <div className="vintage-card p-5">
          <h1 className="font-display text-2xl font-bold leading-snug text-vintage-ink">
            {details?.title ?? "Untitled video"}
          </h1>
          {details?.channelTitle && (
            <p className="mt-2 text-sm text-vintage-ink-muted">{details.channelTitle}</p>
          )}
          <p className="mt-3 text-xs uppercase tracking-wide text-vintage-ink-muted/80">
            Streamed through iTunes Watch
          </p>
        </div>
      </div>
    </AppShell>
  );
}
