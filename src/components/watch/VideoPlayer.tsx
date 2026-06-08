"use client";

import dynamic from "next/dynamic";

export const SiteVideoPlayer = dynamic(
  () => import("@/components/watch/SiteVideoPlayer").then((m) => m.SiteVideoPlayer),
  {
    ssr: false,
    loading: () => (
      <div className="vintage-card overflow-hidden">
        <div className="skeleton aspect-video w-full" />
        <div className="space-y-3 p-4">
          <div className="skeleton h-4 w-2/3" />
          <div className="skeleton h-1.5 w-full" />
          <div className="skeleton h-8 w-32" />
        </div>
      </div>
    ),
  },
);
