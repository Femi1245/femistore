import { NavSkeleton } from "@/components/skeletons/NavSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";

export default function LoginLoading() {
  return (
    <div className="vintage-page flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 flex items-center gap-2">
        <Skeleton className="h-14 w-14" circle />
        <Skeleton className="h-8 w-28" />
      </div>
      <div className="vintage-card w-full max-w-md space-y-4 p-8">
        <Skeleton className="h-8 w-48 mx-auto" />
        <Skeleton className="h-4 w-64 mx-auto" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}
