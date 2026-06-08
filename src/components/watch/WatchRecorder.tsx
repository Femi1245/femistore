"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { recordWatchHistory } from "@/lib/watch";
import type { WatchVideo } from "@/lib/types";

export function WatchRecorder({
  userId,
  video,
}: {
  userId: string;
  video: WatchVideo;
}) {
  useEffect(() => {
    recordWatchHistory(createClient(), userId, video).catch(() => {});
  }, [userId, video.videoKey, video.source, video.title]);

  return null;
}
