import { FeedSkeleton } from "@/components/skeletons/FeedSkeleton";
import { NavSkeleton } from "@/components/skeletons/NavSkeleton";

export default function FeedLoading() {
  return (
    <div className="vintage-page min-h-screen">
      <NavSkeleton />
      <FeedSkeleton />
    </div>
  );
}
