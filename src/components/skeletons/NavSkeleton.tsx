import { Skeleton } from "@/components/ui/Skeleton";

export function NavSkeleton() {
  return (
    <header className="vintage-nav sticky top-0 z-50">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9" circle />
          <Skeleton className="h-5 w-20" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
        </div>
        <Skeleton className="h-8 w-8" circle />
      </div>
    </header>
  );
}
