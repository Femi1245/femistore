import { Skeleton } from "@/components/ui/Skeleton";

export default function HomeLoading() {
  return (
    <div className="vintage-page min-h-screen">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-10" circle />
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-6 py-20 text-center space-y-6">
        <Skeleton className="h-6 w-48 mx-auto" />
        <Skeleton className="h-14 w-full max-w-xl mx-auto" />
        <Skeleton className="h-14 w-full max-w-lg mx-auto" />
        <div className="flex justify-center gap-4 pt-4">
          <Skeleton className="h-12 w-40" />
          <Skeleton className="h-12 w-36" />
        </div>
      </div>
    </div>
  );
}
