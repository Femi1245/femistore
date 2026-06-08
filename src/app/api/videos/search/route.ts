import { NextResponse } from "next/server";
import { parseYouTubeVideoId, searchYouTubeVideos } from "@/lib/youtube";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim();

  if (!q) {
    return NextResponse.json({ error: "Search query is required" }, { status: 400 });
  }

  const pastedId = parseYouTubeVideoId(q);
  if (pastedId) {
    return NextResponse.json({
      videos: [],
      redirectTo: `/watch/${pastedId}`,
    });
  }

  try {
    const videos = await searchYouTubeVideos(q);
    return NextResponse.json({ videos });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not search for videos right now";

    return NextResponse.json({ error: message, videos: [] }, { status: 503 });
  }
}
