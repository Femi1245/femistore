import { NavSkeleton } from "@/components/skeletons/NavSkeleton";

export default function NotificationsLoading() {
  return (
    <div className="vintage-page min-h-screen">
      <NavSkeleton />
      <div className="mx-auto max-w-5xl space-y-3 px-4 py-6">
        <div className="h-7 w-40 animate-pulse rounded bg-vintage-ink/10" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg border border-vintage-ink/10 bg-vintage-surface/50 px-4 py-3"
          >
            <div className="h-10 w-10 animate-pulse rounded-full bg-vintage-ink/10" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-3/4 animate-pulse rounded bg-vintage-ink/10" />
              <div className="h-3 w-24 animate-pulse rounded bg-vintage-ink/10" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
