import { Skeleton } from "@/components/ui/Skeleton";

export function ChatSkeleton() {
  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col md:flex-row">
      <aside className="flex w-full flex-col border-r-2 border-vintage-border md:w-80">
        <div className="border-b-2 border-vintage-border p-3 space-y-3">
          <div className="flex items-center gap-2 vintage-card-inset p-2">
            <Skeleton className="h-8 w-8" circle />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-2 w-32" />
            </div>
          </div>
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="flex-1 space-y-0">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 border-b border-vintage-border/30 px-4 py-3"
            >
              <Skeleton className="h-10 w-10" circle />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-2 w-full" />
              </div>
            </div>
          ))}
        </div>
      </aside>
      <main className="hidden flex-1 flex-col md:flex">
        <div className="border-b-2 border-vintage-border p-4 flex items-center gap-3">
          <Skeleton className="h-10 w-10" circle />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <div className="flex-1 space-y-3 p-4">
          <Skeleton className="h-12 w-2/3 ml-auto rounded-sm" />
          <Skeleton className="h-12 w-1/2 rounded-sm" />
          <Skeleton className="h-12 w-3/5 ml-auto rounded-sm" />
        </div>
        <div className="border-t-2 border-vintage-border p-4">
          <Skeleton className="h-12 w-full rounded-sm" />
        </div>
      </main>
    </div>
  );
}
