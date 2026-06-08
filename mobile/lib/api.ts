const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);

export function getApiUrl(): string {
  return API_URL;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<{ data?: T; error?: string }> {
  const { token, ...init } = options;
  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers ?? {}),
      },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { error: json.error ?? res.statusText };
    }
    return { data: json as T };
  } catch {
    return {
      error: `Cannot reach API at ${API_URL}. Deploy the web app or set EXPO_PUBLIC_API_URL.`,
    };
  }
}

export async function searchVideos(query: string) {
  return apiFetch<{ videos: unknown[] }>(
    `/api/videos/search?q=${encodeURIComponent(query)}`,
  );
}

export async function startLiveStream(
  title: string,
  accessToken: string,
) {
  return apiFetch<{
    stream: { room_name: string; title: string };
    token: string;
    serverUrl: string;
  }>("/api/live/start", {
    method: "POST",
    body: JSON.stringify({ title }),
    token: accessToken,
  });
}

export async function getLiveToken(roomName: string, accessToken: string) {
  return apiFetch<{ token: string; serverUrl: string }>(
    `/api/live/token?room=${encodeURIComponent(roomName)}`,
    { token: accessToken },
  );
}

export async function endLiveStream(roomName: string, accessToken: string) {
  return apiFetch("/api/live/end", {
    method: "POST",
    body: JSON.stringify({ roomName }),
    token: accessToken,
  });
}
