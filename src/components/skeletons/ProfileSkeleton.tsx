import { PostCardSkeleton } from "@/components/skeletons/PostCardSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";

export function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <div className="vintage-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <Skeleton className="h-24 w-24" circle />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-full max-w-md" />
            <Skeleton className="h-4 w-full max-w-sm" />
            <div className="flex gap-6 pt-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="h-10 w-28" />
          </div>
        </div>
      </div>
      <Skeleton className="h-6 w-20" />
      <PostCardSkeleton />
      <PostCardSkeleton />
    </div>
  );
}
