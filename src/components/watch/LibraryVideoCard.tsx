import Link from "next/link";
import { Play } from "lucide-react";
import { getWatchHref } from "@/lib/watch";
import type { WatchVideo } from "@/lib/types";

export function LibraryVideoCard({
  video,
  meta,
}: {
  video: WatchVideo;
  meta?: string;
}) {
  return (
    <Link
      href={getWatchHref(video)}
      className="vintage-card group overflow-hidden transition-transform hover:-translate-y-0.5"
    >
      <div className="relative aspect-video overflow-hidden bg-vintage-paper-dark">
        {video.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={video.thumbnailUrl}
            alt=""
            className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-vintage-paper-dark text-vintage-ink-muted">
            Video
          </div>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-vintage-rust text-[var(--vintage-btn-text)] shadow-lg">
            <Play className="h-5 w-5 fill-current" />
          </span>
        </span>
        {video.source === "upload" && (
          <span className="absolute left-2 top-2 rounded-sm bg-vintage-rust px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--vintage-btn-text)]">
            Upload
          </span>
        )}
      </div>
      <div className="space-y-1 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-vintage-ink">
          {video.title}
        </h3>
        <p className="text-xs text-vintage-ink-muted">
          {meta ?? video.channelTitle ?? "Zumelia Watch"}
        </p>
      </div>
    </Link>
  );
}
