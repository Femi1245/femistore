import { Skeleton } from "@/components/ui/Skeleton";

export function PostCardSkeleton() {
  return (
    <div className="vintage-card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10" circle />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-48 w-full rounded-sm" />
      <div className="flex gap-4 pt-2 border-t border-vintage-border/40">
        <Skeleton className="h-8 w-14" />
        <Skeleton className="h-8 w-14" />
        <Skeleton className="h-8 w-14" />
      </div>
    </div>
  );
}
