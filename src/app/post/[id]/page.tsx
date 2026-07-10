import { Suspense } from "react";
import { PostDetailView } from "@/components/social/PostDetailView";
import { PostCardSkeleton } from "@/components/skeletons/PostCardSkeleton";
import { AppShell } from "@/components/layout/AppShell";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  return (
    <AppShell user={user} wide>
      <div className="mx-auto w-full max-w-2xl">
        <Suspense fallback={<PostCardSkeleton />}>
          <PostDetailView postId={id} currentUser={user} />
        </Suspense>
      </div>
    </AppShell>
  );
}
