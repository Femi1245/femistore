export type VideoResult = {
  id: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  publishedAt?: string;
};

export type VideoDetails = {
  id: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
};

const INVIDIOUS_INSTANCES = [
  "https://vid.puffyan.us",
  "https://inv.nadeko.net",
  "https://yewtu.be",
];

export function isYouTubeApiConfigured(): boolean {
  return Boolean(process.env.YOUTUBE_API_KEY?.trim());
}

/** Extract a YouTube video ID from a URL or bare ID string. */
export function parseYouTubeVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = url.pathname.slice(1).split("/")[0];
      return id && /^[\w-]{11}$/.test(id) ? id : null;
    }

    if (host === "youtube.com" || host === "m.youtube.com") {
      const fromQuery = url.searchParams.get("v");
      if (fromQuery && /^[\w-]{11}$/.test(fromQuery)) return fromQuery;

      const fromPath = url.pathname.match(/\/(?:embed|shorts|v|live)\/([\w-]{11})/);
      if (fromPath?.[1]) return fromPath[1];
    }
  } catch {
    return null;
  }

  return null;
}

export async function searchYouTubeVideos(query: string): Promise<VideoResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  if (isYouTubeApiConfigured()) {
    try {
      return await searchViaYouTubeApi(trimmed);
    } catch {
      // Fall through to Invidious if the official API fails.
    }
  }

  return searchViaInvidious(trimmed);
}

export async function fetchVideoDetails(videoId: string): Promise<VideoDetails | null> {
  if (isYouTubeApiConfigured()) {
    try {
      const details = await fetchDetailsViaYouTubeApi(videoId);
      if (details) return details;
    } catch {
      // Fall through to oEmbed.
    }
  }

  return fetchDetailsViaOEmbed(videoId);
}

async function searchViaYouTubeApi(query: string): Promise<VideoResult[]> {
  const key = process.env.YOUTUBE_API_KEY!.trim();
  const params = new URLSearchParams({
    part: "snippet",
    type: "video",
    q: query,
    maxResults: "20",
    key,
  });

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/search?${params.toString()}`,
    { next: { revalidate: 300 } },
  );

  if (!res.ok) {
    throw new Error(`YouTube search failed (${res.status})`);
  }

  const data = (await res.json()) as {
    items?: Array<{
      id?: { videoId?: string };
      snippet?: {
        title?: string;
        channelTitle?: string;
        publishedAt?: string;
        thumbnails?: {
          medium?: { url?: string };
          high?: { url?: string };
          default?: { url?: string };
        };
      };
    }>;
  };

  return (data.items ?? [])
    .map((item): VideoResult | null => {
      const id = item.id?.videoId;
      const snippet = item.snippet;
      if (!id || !snippet?.title) return null;

      const thumbs = snippet.thumbnails;
      const thumbnailUrl =
        thumbs?.medium?.url ?? thumbs?.high?.url ?? thumbs?.default?.url ?? "";

      return {
        id,
        title: snippet.title,
        channelTitle: snippet.channelTitle ?? "Unknown channel",
        thumbnailUrl,
        publishedAt: snippet.publishedAt,
      };
    })
    .filter((item): item is VideoResult => item !== null);
}

async function searchViaInvidious(query: string): Promise<VideoResult[]> {
  let lastError: Error | null = null;

  for (const base of INVIDIOUS_INSTANCES) {
    try {
      const res = await fetch(
        `${base}/api/v1/search?q=${encodeURIComponent(query)}&type=video`,
        { signal: AbortSignal.timeout(10_000) },
      );

      if (!res.ok) {
        lastError = new Error(`Invidious search failed (${res.status})`);
        continue;
      }

      const data = (await res.json()) as Array<{
        type?: string;
        videoId?: string;
        title?: string;
        author?: string;
        published?: number;
        videoThumbnails?: Array<{ quality?: string; url?: string }>;
      }>;

      const videos = data
        .filter((item) => item.type === "video" && item.videoId && item.title)
        .slice(0, 20)
        .map((item) => {
          const thumbs = item.videoThumbnails ?? [];
          const thumbnailUrl =
            thumbs.find((t) => t.quality === "medium")?.url ??
            thumbs.find((t) => t.quality === "high")?.url ??
            thumbs[0]?.url ??
            `https://i.ytimg.com/vi/${item.videoId}/mqdefault.jpg`;

          return {
            id: item.videoId!,
            title: item.title!,
            channelTitle: item.author ?? "Unknown channel",
            thumbnailUrl,
            publishedAt: item.published
              ? new Date(item.published * 1000).toISOString()
              : undefined,
          };
        });

      if (videos.length > 0) return videos;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error("Invidious search failed");
    }
  }

  throw lastError ?? new Error("Video search is temporarily unavailable");
}

async function fetchDetailsViaYouTubeApi(videoId: string): Promise<VideoDetails | null> {
  const key = process.env.YOUTUBE_API_KEY!.trim();
  const params = new URLSearchParams({
    part: "snippet",
    id: videoId,
    key,
  });

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?${params.toString()}`,
    { next: { revalidate: 3600 } },
  );

  if (!res.ok) return null;

  const data = (await res.json()) as {
    items?: Array<{
      id?: string;
      snippet?: {
        title?: string;
        channelTitle?: string;
        thumbnails?: {
          maxres?: { url?: string };
          high?: { url?: string };
          medium?: { url?: string };
        };
      };
    }>;
  };

  const item = data.items?.[0];
  if (!item?.id || !item.snippet?.title) return null;

  const thumbs = item.snippet.thumbnails;
  const thumbnailUrl =
    thumbs?.maxres?.url ??
    thumbs?.high?.url ??
    thumbs?.medium?.url ??
    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  return {
    id: item.id,
    title: item.snippet.title,
    channelTitle: item.snippet.channelTitle ?? "Unknown channel",
    thumbnailUrl,
  };
}

async function fetchDetailsViaOEmbed(videoId: string): Promise<VideoDetails | null> {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const res = await fetch(
    `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`,
    { next: { revalidate: 3600 } },
  );

  if (!res.ok) return null;

  const data = (await res.json()) as {
    title?: string;
    author_name?: string;
    thumbnail_url?: string;
  };

  if (!data.title) return null;

  return {
    id: videoId,
    title: data.title,
    channelTitle: data.author_name ?? "Unknown channel",
    thumbnailUrl:
      data.thumbnail_url ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  };
}
