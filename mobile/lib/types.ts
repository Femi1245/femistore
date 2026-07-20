export type Profile = {
  id: string;
  username: string;
  display_name: string;
  country: string;
  avatar_url: string | null;
  bio: string;
  date_of_birth: string | null;
  phone_e164: string | null;
  phone_verified_at: string | null;
  show_read_receipts?: boolean;
  created_at: string;
};

export type ConversationKind = "dm" | "group" | "channel";
export type MemberRole = "owner" | "admin" | "member";

export type MessageType = "text" | "voice" | "call_log";

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: MessageType;
  media_url: string | null;
  media_duration_seconds: number | null;
  expires_at: string | null;
  deleted_at?: string | null;
  created_at: string;
};

export type ConversationPreview = {
  id: string;
  kind: ConversationKind;
  name: string | null;
  is_secret?: boolean;
  other_user?: Profile;
  member_count?: number;
  my_role?: MemberRole;
  last_message: string | null;
  last_message_at: string | null;
};

export type ActiveChat = {
  convId: string;
  kind: ConversationKind;
  title: string;
  subtitle: string;
  avatarName: string;
  avatarUrl: string | null;
  isSecret?: boolean;
  otherUser?: Profile;
  canPost: boolean;
  members?: Profile[];
  myRole?: MemberRole;
};

export type Post = {
  id: string;
  user_id: string;
  content: string;
  media_url: string | null;
  media_type: "image" | "video" | null;
  reshare_of: string | null;
  created_at: string;
  author?: Profile;
  original_post?: Post | null;
};

export type PostEngagement = {
  likes: number;
  comments: number;
  reshares: number;
  liked_by_me: boolean;
  reshared_by_me: boolean;
};

export type PostWithMeta = Post & {
  engagement: PostEngagement;
};

export type PostViewDay = {
  date: string;
  views: number;
};

export type PostAnalyticsViewer = {
  viewerId: string;
  viewedAt: string;
  profile?: Profile;
};

export type PostAnalytics = {
  postId: string;
  views: number;
  likes: number;
  comments: number;
  reshares: number;
  engagementRate: number;
  viewsByDay: PostViewDay[];
  recentViewers: PostAnalyticsViewer[];
  schemaMissing?: boolean;
};

export type Comment = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author?: Profile;
};

export type FollowCounts = {
  followers: number;
  following: number;
};

export type NotificationType =
  | "follow"
  | "like"
  | "comment"
  | "reshare"
  | "new_post"
  | "new_status"
  | "message"
  | "live_started"
  | "live_ended"
  | "gift";

export type Notification = {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  type: NotificationType;
  entity_type: string;
  entity_id: string;
  message: string | null;
  read_at: string | null;
  created_at: string;
  actor?: Profile;
};

export type LiveStream = {
  id: string;
  host_id: string;
  title: string;
  room_name: string;
  is_live: boolean;
  started_at: string;
  ended_at: string | null;
  host?: Profile;
};

export type LiveChatMessage = {
  id: string;
  room_name: string;
  user_id: string;
  content: string;
  created_at: string;
  author?: Profile;
};

export type VideoSource = "stream" | "upload";

export type WatchVideo = {
  videoKey: string;
  source: VideoSource;
  title: string;
  channelTitle?: string | null;
  thumbnailUrl?: string | null;
  videoUrl?: string | null;
};

export type WatchHistoryEntry = WatchVideo & {
  id: string;
  watchedAt: string;
};

export type Playlist = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
};

export type PlaylistItem = WatchVideo & {
  id: string;
  playlist_id: string;
  position: number;
  added_at: string;
};

export type UserVideo = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  storage_path: string;
  thumbnail_url: string | null;
  created_at: string;
  video_url?: string;
  author?: Profile;
};

export type StatusMediaType = "text" | "image" | "video";

export type StatusUpdate = {
  id: string;
  user_id: string;
  content: string;
  media_url: string | null;
  media_type: StatusMediaType;
  background_color: string;
  created_at: string;
  expires_at: string;
  reshare_of?: string | null;
};

export type StatusEngagement = {
  likes: number;
  comments: number;
  reshares: number;
  views: number;
  liked_by_me: boolean;
  reshared_by_me: boolean;
};

export type StatusComment = {
  id: string;
  status_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author?: Profile;
};

export type StatusViewerRow = {
  viewerId: string;
  viewedAt: string;
  profile?: Profile;
};

export type StatusGroup = {
  user: Profile;
  items: StatusUpdate[];
  hasUnseen: boolean;
  isOwn: boolean;
};
