import { NavSkeleton } from "@/components/skeletons/NavSkeleton";

export default function WatchLoading() {
  return (
    <div className="vintage-page min-h-screen">
      <NavSkeleton />
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <div className="skeleton h-8 w-32" />
        <div className="skeleton h-4 w-64" />
        <div className="flex gap-3">
          <div className="skeleton h-12 flex-1" />
          <div className="skeleton h-12 w-28" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="vintage-card overflow-hidden">
              <div className="skeleton aspect-video w-full" />
              <div className="space-y-2 p-3">
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
