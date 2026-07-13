export type AccountKind = "personal" | "business";
export type AccountMode = "personal" | "business";
export type DmPolicy = "everyone" | "friends" | "business_only" | "nobody";
export type ChatInbox = "personal" | "business";
export type DmContext = "personal" | "business";
export type BusinessAutoReplyMode = "template" | "ai";
export type ProfileTheme = "default" | "rust" | "olive" | "midnight" | "paper";
export type ReportTargetType = "user" | "post" | "message" | "comment";

export type VerificationCategory = "public_figure" | "celebrity" | "official" | "notable";
export type VerificationRequestStatus = "pending" | "approved" | "rejected";

export type VerificationRequest = {
  id: string;
  user_id: string;
  status: VerificationRequestStatus;
  category: VerificationCategory;
  public_links: string[];
  applicant_note: string;
  admin_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

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
  business_auto_reply_mode?: BusinessAutoReplyMode;
  business_auto_reply_max_count?: number;
  business_auto_reply_hours_start?: string | null;
  business_auto_reply_hours_end?: string | null;
  business_featured: boolean;
  business_featured_at: string | null;
  is_verified: boolean;
  verified_at: string | null;
  verified_category: VerificationCategory | null;
  verified_by: string | null;
  is_private: boolean;
  dm_policy: DmPolicy;
  personal_dm_policy?: DmPolicy | null;
  business_dm_policy?: DmPolicy | null;
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
  inbox?: ChatInbox;
  updated_at: string;
};

export type ConversationKind = "dm" | "group" | "channel";
export type MemberRole = "owner" | "admin" | "member";

export type MessageType = "text" | "voice" | "call_log" | "gift" | "poll" | "payment";

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
  chat_payment_id: string | null;
  poll_id: string | null;
  reply_to_id: string | null;
  is_auto_reply?: boolean;
  deleted_at?: string | null;
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
  recipient_id: string | null;
  delivered_at: string | null;
  started_at: string;
  ended_at: string | null;
  created_at: string;
  initiator?: Profile;
  recipient?: Profile;
};

export type ConversationPreview = {
  id: string;
  kind: ConversationKind;
  name: string | null;
  is_secret?: boolean;
  dm_context?: DmContext;
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
  inbox?: ChatInbox;
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

export type ConnectionRequest = {
  id: string;
  from_user_id: string;
  to_user_id: string;
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
  dm_context?: DmContext;
  created_by?: string | null;
  isSellerGig?: boolean;
  otherUser?: Profile;
  canPost: boolean;
  members?: Profile[];
  myRole?: MemberRole;
};

export type PostContext = "personal" | "business";

export type Post = {
  id: string;
  user_id: string;
  content: string;
  media_url: string | null;
  media_type: "image" | "video" | null;
  reshare_of: string | null;
  post_context?: PostContext;
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
  /** Interactions / views as a percentage (0–100+). */
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
  | "gift"
  | "connection_request";

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

export type LiveStreamViewer = {
  room_name: string;
  user_id: string;
  joined_at: string;
  last_seen_at: string;
  profile?: Profile;
};

export type LiveJoinRequestType = "request" | "invite";
export type LiveJoinRequestStatus = "pending" | "approved" | "declined";

export type LiveJoinRequest = {
  id: string;
  room_name: string;
  user_id: string;
  request_type: LiveJoinRequestType;
  status: LiveJoinRequestStatus;
  created_at: string;
  responded_at: string | null;
  profile?: Profile;
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

export type OpportunityType =
  | "job"
  | "gig"
  | "collab"
  | "internship"
  | "volunteer"
  | "other";

export type OpportunityWorkMode = "remote" | "onsite" | "hybrid";

export type OpportunityCompensation =
  | "paid"
  | "unpaid"
  | "negotiable"
  | "commission";

export type OpportunityListingKind = "seeking" | "offering";

export type OpportunityMediaType = "image" | "video" | "document";

export type OpportunityAttachment = {
  type: OpportunityMediaType;
  url: string;
  name: string;
  size_bytes: number;
};

export type Opportunity = {
  id: string;
  poster_id: string;
  title: string;
  description: string;
  opportunity_type: OpportunityType;
  listing_kind: OpportunityListingKind;
  service_name: string;
  attachments: OpportunityAttachment[];
  category: string;
  location: string;
  work_mode: OpportunityWorkMode;
  compensation_type: OpportunityCompensation;
  compensation_detail: string;
  application_url: string | null;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  poster?: Profile;
};

export type VoiceRoom = {
  id: string;
  host_id: string;
  title: string;
  topic: string;
  room_name: string;
  is_active: boolean;
  started_at: string;
  ended_at: string | null;
  host?: Profile;
};

export type VibeResponse = {
  id: string;
  user_id: string;
  prompt_key: string;
  prompt_text: string;
  response: string;
  created_at: string;
};

export type ChatPayment = {
  id: string;
  conversation_id: string;
  sender_id: string;
  recipient_id: string;
  amount_cents: number;
  currency: string;
  note: string;
  payment_status: "pending" | "paid" | "mock" | "failed";
  payment_provider: string | null;
  payment_reference: string | null;
  message_id: string | null;
  created_at: string;
};
