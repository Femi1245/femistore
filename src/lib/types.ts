export type AccountKind = "personal" | "business";
export type AccountMode = "personal" | "business";
export type DmPolicy = "everyone" | "friends" | "business_only" | "nobody";
export type ProfileTheme = "default" | "rust" | "olive" | "midnight" | "paper";
export type ReportTargetType = "user" | "post" | "message" | "comment";

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
  business_contact_enabled: boolean;
  business_auto_reply_enabled: boolean;
  business_auto_reply_message: string;
  business_featured: boolean;
  business_featured_at: string | null;
  is_private: boolean;
  dm_policy: DmPolicy;
  show_last_seen: boolean;
  show_read_receipts: boolean;
  ai_assistant_enabled: boolean;
  digest_mode: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  profile_theme: ProfileTheme;
  profile_accent_color: string | null;
  created_at: string;
};

export type ChatWallpaperType = "default" | "color" | "image";

export type ConversationMemberSettings = {
  conversation_id: string;
  user_id: string;
  wallpaper_type: ChatWallpaperType;
  wallpaper_color: string | null;
  wallpaper_url: string | null;
  is_pinned: boolean;
  pinned_at: string | null;
  is_archived: boolean;
  archived_at: string | null;
  translation_enabled: boolean;
  translation_target_lang: string;
  notifications_muted: boolean;
  last_read_at: string | null;
  folder_id: string | null;
  updated_at: string;
};

export type ConversationKind = "dm" | "group" | "channel";
export type MemberRole = "owner" | "admin" | "member";

export type MessageType = "text" | "voice" | "call_log" | "gift" | "poll";

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
  poll_id: string | null;
  reply_to_id: string | null;
  created_at: string;
  edited_at: string | null;
  reply_to?: MessageReplyPreview | null;
};

export type MessageReplyPreview = {
  id: string;
  content: string;
  sender_id: string;
  sender?: Profile;
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
  is_pinned?: boolean;
  is_archived?: boolean;
  is_unread?: boolean;
  folder_id?: string | null;
  is_pending_request?: boolean;
};

export type ChatFolder = {
  id: string;
  user_id: string;
  name: string;
  sort_order: number;
  created_at: string;
};

export type DmRequest = {
  id: string;
  conversation_id: string;
  from_user_id: string;
  to_user_id: string;
  preview: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  from_user?: Profile;
};

export type ContentReport = {
  id: string;
  reporter_id: string;
  target_type: ReportTargetType;
  target_id: string;
  reason: string;
  details: string;
  status: string;
  created_at: string;
};

export type AccountAppeal = {
  id: string;
  user_id: string;
  reference_id: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
};

export type KeywordMute = {
  id: string;
  user_id: string;
  keyword: string;
  created_at: string;
};

export type GroupPoll = {
  id: string;
  conversation_id: string;
  creator_id: string;
  question: string;
  is_anonymous: boolean;
  allow_multiple: boolean;
  expires_at: string | null;
  created_at: string;
  options?: PollOption[];
  votes?: PollVote[];
};

export type PollOption = {
  id: string;
  poll_id: string;
  label: string;
  sort_order: number;
  vote_count?: number;
  voted_by_me?: boolean;
};

export type PollVote = {
  poll_id: string;
  option_id: string;
  user_id: string;
  created_at: string;
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
  reply_to_id: string | null;
  created_at: string;
  author?: Profile;
  reply_to?: CommentReplyPreview | null;
};

export type CommentReplyPreview = {
  id: string;
  content: string;
  user_id: string;
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
