export type AccountKind = "personal" | "business";
export type AccountMode = "personal" | "business";

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
  last_seen_at: string | null;
  account_kind: AccountKind;
  business_enabled: boolean;
  active_mode: AccountMode;
  business_name: string | null;
  business_category: string | null;
  business_tagline: string | null;
  business_description: string | null;
  business_website: string | null;
  business_email: string | null;
  business_phone: string | null;
  business_location: string | null;
  business_cover_url: string | null;
  business_services: string | null;
  created_at: string;
};

export type ChatWallpaperType = "default" | "color" | "image";

export type ConversationMemberSettings = {
  conversation_id: string;
  user_id: string;
  wallpaper_type: ChatWallpaperType;
  wallpaper_color: string | null;
  wallpaper_url: string | null;
  updated_at: string;
};

export type ConversationKind = "dm" | "group" | "channel";
export type MemberRole = "owner" | "admin" | "member";

export type MessageType = "text" | "voice" | "call_log" | "gift";

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: MessageType;
  media_url: string | null;
  media_duration_seconds: number | null;
  expires_at: string | null;
  sent_gift_id: string | null;
  created_at: string;
  edited_at: string | null;
};

export type CallType = "audio" | "video";
export type CallStatus = "ringing" | "active" | "ended" | "missed" | "declined";

export type CallSession = {
  id: string;
  conversation_id: string;
  room_name: string;
  call_type: CallType;
  status: CallStatus;
  initiator_id: string;
  started_at: string;
  ended_at: string | null;
  created_at: string;
  initiator?: Profile;
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
  edited_at: string | null;
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

export type GiftContext = "profile" | "chat" | "live";

export type GiftCatalogItem = {
  id: string;
  name: string;
  emoji: string;
  price_cents: number;
  sort_order: number;
};

export type SentGift = {
  id: string;
  catalog_id: string;
  sender_id: string;
  recipient_id: string;
  context: GiftContext;
  conversation_id: string | null;
  room_name: string | null;
  note: string;
  amount_cents: number;
  payment_status: "pending" | "mock" | "paid" | "failed";
  payment_provider: string | null;
  payment_reference: string | null;
  created_at: string;
  catalog?: GiftCatalogItem;
  sender?: Profile;
  recipient?: Profile;
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
};

export type StatusGroup = {
  user: Profile;
  items: StatusUpdate[];
  hasUnseen: boolean;
  isOwn: boolean;
};
