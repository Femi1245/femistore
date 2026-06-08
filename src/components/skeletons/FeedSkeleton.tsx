import { PostCardSkeleton } from "@/components/skeletons/PostCardSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";

export function FeedSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="vintage-card p-4 space-y-3">
        <div className="flex gap-3">
          <Skeleton className="h-10 w-10" circle />
          <Skeleton className="h-20 flex-1 rounded-sm" />
        </div>
        <Skeleton className="h-9 w-24 ml-auto" />
      </div>
      <PostCardSkeleton />
      <PostCardSkeleton />
      <PostCardSkeleton />
    </div>
  );
}
