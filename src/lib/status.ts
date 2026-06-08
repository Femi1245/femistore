import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile, StatusGroup, StatusMediaType, StatusUpdate } from "./types";

export const STATUS_BACKGROUNDS = [
  "#b85c38",
  "#5c6b4a",
  "#c9a227",
  "#3d2e24",
  "#8f4528",
  "#6b5344",
];

export async function uploadStatusMedia(
  supabase: SupabaseClient,
  userId: string,
  file: File,
): Promise<{ url: string | null; error?: string }> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const path = `${userId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from("status-media").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) return { url: null, error: error.message };

  const { data } = supabase.storage.from("status-media").getPublicUrl(path);
  return { url: data.publicUrl };
}

export async function createStatus(
  supabase: SupabaseClient,
  userId: string,
  payload: {
    content?: string;
    mediaUrl?: string | null;
    mediaType: StatusMediaType;
    backgroundColor?: string;
  },
): Promise<{ status: StatusUpdate | null; error?: string }> {
  const { data, error } = await supabase
    .from("status_updates")
    .insert({
      user_id: userId,
      content: payload.content ?? "",
      media_url: payload.mediaUrl ?? null,
      media_type: payload.mediaType,
      background_color: payload.backgroundColor ?? STATUS_BACKGROUNDS[0],
    })
    .select()
    .single();

  if (error) return { status: null, error: error.message };
  return { status: data as StatusUpdate };
}

export async function loadStatusGroups(
  supabase: SupabaseClient,
  userId: string,
): Promise<StatusGroup[]> {
  const { data: following } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId);

  const networkIds = [
    userId,
    ...(following?.map((row) => row.following_id) ?? []),
  ];

  const now = new Date().toISOString();

  const { data: statuses, error } = await supabase
    .from("status_updates")
    .select("*")
    .in("user_id", networkIds)
    .gt("expires_at", now)
    .order("created_at", { ascending: true });

  if (error || !statuses?.length) {
    const { data: selfProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (selfProfile) {
      return [
        {
          user: selfProfile as Profile,
          items: [],
          hasUnseen: false,
          isOwn: true,
        },
      ];
    }
    return [];
  }

  const statusIds = statuses.map((s) => s.id);

  const { data: views } = await supabase
    .from("status_views")
    .select("status_id")
    .eq("viewer_id", userId)
    .in("status_id", statusIds);

  const viewedSet = new Set(views?.map((v) => v.status_id) ?? []);

  const userIds = [...new Set(statuses.map((s) => s.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .in("id", userIds);

  const profileMap = new Map((profiles as Profile[] | null)?.map((p) => [p.id, p]));

  const grouped = new Map<string, StatusUpdate[]>();
  for (const row of statuses as StatusUpdate[]) {
    const list = grouped.get(row.user_id) ?? [];
    list.push(row);
    grouped.set(row.user_id, list);
  }

  const groups: StatusGroup[] = [];

  const selfItems = grouped.get(userId) ?? [];
  const selfProfile = profileMap.get(userId);
  if (selfProfile) {
    groups.push({
      user: selfProfile,
      items: selfItems,
      hasUnseen: false,
      isOwn: true,
    });
  }

  for (const [ownerId, items] of grouped) {
    if (ownerId === userId) continue;
    const user = profileMap.get(ownerId);
    if (!user) continue;

    groups.push({
      user,
      items,
      hasUnseen: items.some((item) => !viewedSet.has(item.id)),
      isOwn: false,
    });
  }

  groups.sort((a, b) => {
    if (a.isOwn) return -1;
    if (b.isOwn) return 1;
    if (a.hasUnseen !== b.hasUnseen) return a.hasUnseen ? -1 : 1;
    const aTime = a.items[a.items.length - 1]?.created_at ?? "";
    const bTime = b.items[b.items.length - 1]?.created_at ?? "";
    return bTime.localeCompare(aTime);
  });

  return groups;
}

export async function markStatusViewed(
  supabase: SupabaseClient,
  statusId: string,
  viewerId: string,
): Promise<void> {
  await supabase.from("status_views").upsert(
    {
      status_id: statusId,
      viewer_id: viewerId,
      viewed_at: new Date().toISOString(),
    },
    { onConflict: "status_id,viewer_id" },
  );
}

export async function deleteOwnStatuses(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  await supabase.from("status_updates").delete().eq("user_id", userId);
}

export function statusTimeLeft(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const hours = Math.floor(ms / 3600000);
  if (hours >= 1) return `${hours}h left`;
  const mins = Math.max(1, Math.floor(ms / 60000));
  return `${mins}m left`;
}
