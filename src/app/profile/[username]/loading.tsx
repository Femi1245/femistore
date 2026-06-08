import { ProfileSkeleton } from "@/components/skeletons/ProfileSkeleton";
import { NavSkeleton } from "@/components/skeletons/NavSkeleton";

export default function ProfileLoading() {
  return (
    <div className="vintage-page min-h-screen">
      <NavSkeleton />
      <ProfileSkeleton />
    </div>
  );
}
