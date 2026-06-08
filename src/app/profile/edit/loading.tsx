import { NavSkeleton } from "@/components/skeletons/NavSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";

export default function ProfileEditLoading() {
  return (
    <div className="vintage-page min-h-screen">
      <NavSkeleton />
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="vintage-card p-6 space-y-6">
          <Skeleton className="h-8 w-40" />
          <div className="flex gap-4">
            <Skeleton className="h-24 w-24" circle />
            <Skeleton className="h-10 w-32" />
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
}
