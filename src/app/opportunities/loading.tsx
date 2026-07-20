import { NavSkeleton } from "@/components/skeletons/NavSkeleton";

export default function OpportunitiesLoading() {
  return (
    <div className="vintage-page min-h-screen">
      <NavSkeleton />
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-6">
        <div className="h-8 w-48 animate-pulse rounded bg-vintage-ink/10" />
        <div className="h-4 w-72 animate-pulse rounded bg-vintage-ink/10" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="vintage-card h-40 animate-pulse bg-vintage-surface/50"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
