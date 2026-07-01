"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import {
  Heart,
  MessageCircle,
  Repeat2,
  Send,
  Pencil,
  Check,
  X,
  Reply,
} from "lucide-react";
import { ReplyQuote } from "@/components/chat/ReplyQuote";
import { createClient } from "@/lib/supabase/client";
import { canEditWithinWindow } from "@/lib/edit-window";
import { COMMENT_MAX_LENGTH } from "@/lib/content-limits";
import {
  addComment,
  editPost,
  formatPostDate,
  loadComments,
  resharePost,
  toggleLike,
} from "@/lib/social";
import {
  getBusinessProfileUrl,
  getPersonalProfileUrl,
  hasBusinessProfile,
} from "@/lib/business";
import type { Comment, PostWithMeta, Profile } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";

function PostBody({
  post,
  contentOverride,
}: {
  post: PostWithMeta;
  contentOverride?: string;
}) {
  const target = post.original_post ?? post;
  const displayContent = contentOverride ?? post.content;

  return (
    <>
      {!post.reshare_of && displayContent && (
        <p className="editorial-post-body whitespace-pre-wrap">{displayContent}</p>
      )}
      {post.reshare_of && displayContent && (
        <p className="mb-2 text-sm italic text-vintage-ink-muted">{displayContent}</p>
      )}
      {post.reshare_of && target.content && (
        <p className="editorial-post-body whitespace-pre-wrap">{target.content}</p>
      )}
      {target.media_url && target.media_type === "image" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={target.media_url}
          alt=""
          className="editorial-media-frame max-h-96 w-full object-cover"
        />
      )}
      {target.media_url && target.media_type === "video" && (
        <video
          src={target.media_url}
          controls
          className="editorial-media-frame max-h-96 w-full"
        />
      )}
    </>
  );
}

export function PostCard({
  post,
  currentUser,
  onUpdate,
}: {
  post: PostWithMeta;
  currentUser: Profile;
  onUpdate: () => void;
}) {
  const [engagement, setEngagement] = useState(post.engagement);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [replyingToComment, setReplyingToComment] = useState<Comment | null>(null);
  const [loadingComments, setLoadingComments] = useState(false);
  const [reshareOpen, setReshareOpen] = useState(false);
  const [reshareCaption, setReshareCaption] = useState("");
  const [content, setContent] = useState(post.content);
  const [editedAt, setEditedAt] = useState(post.edited_at ?? null);
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(post.content);
  const [editError, setEditError] = useState<string | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const author = post.author;
  const rootId = post.reshare_of ?? post.id;
  const isOwnPost = post.user_id === currentUser.id;
  const canEdit =
    isOwnPost && canEditWithinWindow(post.created_at);

  const loadCommentsList = useCallback(async () => {
    setLoadingComments(true);
    const list = await loadComments(createClient(), rootId);
    setComments(list);
    setLoadingComments(false);
  }, [rootId]);

  async function handleLike() {
    const supabase = createClient();
    await toggleLike(supabase, rootId, currentUser.id, engagement.liked_by_me);
    setEngagement((e) => ({
      ...e,
      liked_by_me: !e.liked_by_me,
      likes: e.liked_by_me ? e.likes - 1 : e.likes + 1,
    }));
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentDraft.trim()) return;
    if (commentDraft.length > COMMENT_MAX_LENGTH) {
      setCommentError(`Comments must be ${COMMENT_MAX_LENGTH} characters or less.`);
      return;
    }
    setCommentError(null);
    const replyId = replyingToComment?.id ?? null;
    const { error } = await addComment(
      createClient(),
      rootId,
      currentUser.id,
      commentDraft.trim(),
      replyId,
    );
    if (error) {
      setCommentError(error.message);
      return;
    }
    setCommentDraft("");
    setReplyingToComment(null);
    setEngagement((e) => ({ ...e, comments: e.comments + 1 }));
    await loadCommentsList();
  }

  async function handleReshare() {
    const { error } = await resharePost(
      createClient(),
      rootId,
      currentUser.id,
      reshareCaption.trim(),
    );
    if (!error) {
      setEngagement((e) => ({
        ...e,
        reshared_by_me: true,
        reshares: e.reshares + 1,
      }));
      setReshareOpen(false);
      setReshareCaption("");
      onUpdate();
    }
  }

  async function toggleComments() {
    const next = !showComments;
    setShowComments(next);
    if (next) await loadCommentsList();
  }

  async function handleSaveEdit() {
    setSavingEdit(true);
    setEditError(null);
    const { error } = await editPost(
      createClient(),
      post.id,
      currentUser.id,
      editDraft,
      post.created_at,
    );
    setSavingEdit(false);
    if (error) {
      setEditError(error);
      return;
    }
    setContent(editDraft.trim());
    setEditedAt(new Date().toISOString());
    setEditing(false);
    onUpdate();
  }

  if (!author) return null;

  const isBusinessPost = (post.post_context ?? "personal") === "business";
  const authorHref =
    isBusinessPost && hasBusinessProfile(author)
      ? getBusinessProfileUrl(author.username)
      : getPersonalProfileUrl(author.username);
  const authorLabel =
    isBusinessPost && author.business_name ? author.business_name : author.display_name;

  return (
    <article className="editorial-post group">
      <div className="flex items-start gap-3">
        <Link href={authorHref}>
          <Avatar name={authorLabel} avatarUrl={author.avatar_url} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <Link
              href={authorHref}
              className="font-display inline-flex items-center gap-1 text-base font-semibold tracking-tight hover:text-vintage-rust"
            >
              {authorLabel}
              {author.is_verified && (
                <VerifiedBadge category={author.verified_category} size="xs" />
              )}
            </Link>
            {isBusinessPost && (
              <span className="rounded-sm bg-vintage-rust/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-vintage-rust">
                Listing
              </span>
            )}
            <span className="text-vintage-ink-muted">@{author.username}</span>
            <span className="text-xs text-vintage-ink-muted/70">
              · {formatPostDate(post.created_at)}
              {editedAt ? " · edited" : ""}
            </span>
            {canEdit && !editing && (
              <button
                type="button"
                onClick={() => {
                  setEditDraft(content);
                  setEditing(true);
                }}
                className="ml-auto flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-vintage-ink-muted hover:bg-vintage-paper-dark hover:text-vintage-rust"
              >
                <Pencil className="h-3 w-3" /> Edit
              </button>
            )}
          </div>
          {post.reshare_of && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-vintage-rust">
              <Repeat2 className="h-3 w-3" /> Reshared
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 pl-0 sm:pl-[52px]">
        {editing ? (
          <div className="space-y-2">
            <textarea
              value={editDraft}
              onChange={(e) => setEditDraft(e.target.value)}
              rows={3}
              className="vintage-input w-full resize-none px-3 py-2 text-sm"
            />
            {editError && <p className="text-xs text-vintage-rust">{editError}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={savingEdit || !editDraft.trim()}
                className="vintage-btn flex items-center gap-1 px-3 py-1.5 text-xs disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" /> Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setEditError(null);
                }}
                className="vintage-btn-outline flex items-center gap-1 px-3 py-1.5 text-xs"
              >
                <X className="h-3.5 w-3.5" /> Cancel
              </button>
            </div>
            <p className="text-[10px] text-vintage-ink-muted">
              You can edit for 5 minutes after posting.
            </p>
          </div>
        ) : (
          <PostBody post={post} contentOverride={content} />
        )}

        <div className="mt-4 flex items-center gap-0.5 border-t border-vintage-border/80 pt-3">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              engagement.liked_by_me
                ? "bg-vintage-rust/10 text-vintage-rust"
                : "text-vintage-ink-muted hover:bg-vintage-rust/10 hover:text-vintage-rust"
            }`}
          >
            <Heart
              className={`h-4 w-4 transition-transform ${
                engagement.liked_by_me ? "scale-110 fill-current" : ""
              }`}
            />
            {engagement.likes || ""}
          </button>
          <button
            onClick={toggleComments}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-vintage-ink-muted transition hover:bg-vintage-rust/10 hover:text-vintage-rust"
          >
            <MessageCircle className="h-4 w-4" />
            {engagement.comments || ""}
          </button>
          <button
            onClick={() => setReshareOpen(!reshareOpen)}
            disabled={engagement.reshared_by_me}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:opacity-40 ${
              engagement.reshared_by_me
                ? "text-vintage-olive"
                : "text-vintage-ink-muted hover:bg-vintage-olive/10 hover:text-vintage-olive"
            }`}
          >
            <Repeat2 className="h-4 w-4" />
            {engagement.reshares || ""}
          </button>
        </div>

        {reshareOpen && !engagement.reshared_by_me && (
          <div className="mt-3 flex gap-2">
            <input
              value={reshareCaption}
              onChange={(e) => setReshareCaption(e.target.value)}
              placeholder="Add a caption (optional)"
              className="vintage-input flex-1 px-3 py-2 text-sm"
            />
            <button
              onClick={handleReshare}
              className="vintage-btn px-3 py-2 text-sm"
            >
              Reshare
            </button>
          </div>
        )}

        {showComments && (
          <div className="mt-4 space-y-3 border-t border-vintage-border/50 pt-4">
            {loadingComments ? (
              <p className="text-sm text-vintage-ink-muted">Loading comments…</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="flex gap-2.5">
                  <Avatar
                    name={c.author?.display_name ?? "?"}
                    avatarUrl={c.author?.avatar_url}
                    size="sm"
                  />
                  <div className="vintage-card-inset flex min-w-0 flex-1 flex-col gap-1.5 px-3 py-2.5 text-sm">
                    <p className="font-display font-semibold leading-tight text-vintage-rust">
                      {c.author?.display_name}
                    </p>
                    {c.reply_to && (
                      <ReplyQuote
                        label={c.reply_to.author?.display_name ?? "Comment"}
                        content={c.reply_to.content}
                      />
                    )}
                    <p className="whitespace-pre-wrap break-words leading-relaxed text-vintage-ink">
                      {c.content}
                    </p>
                    <button
                      type="button"
                      onClick={() => setReplyingToComment(c)}
                      className="mt-1 flex items-center gap-1 text-xs font-semibold text-vintage-ink-muted hover:text-vintage-rust"
                    >
                      <Reply className="h-3 w-3" /> Reply
                    </button>
                  </div>
                </div>
              ))
            )}
            {replyingToComment && (
              <div className="flex items-center justify-between gap-2 rounded-lg vintage-card-inset px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-vintage-rust">
                    Replying to {replyingToComment.author?.display_name}
                  </p>
                  <p className="truncate text-xs text-vintage-ink-muted">
                    {replyingToComment.content}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyingToComment(null)}
                  className="text-vintage-ink-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <form onSubmit={handleComment} className="space-y-1">
              <div className="flex gap-2">
                <input
                  value={commentDraft}
                  onChange={(e) => {
                    setCommentDraft(e.target.value.slice(0, COMMENT_MAX_LENGTH));
                    setCommentError(null);
                  }}
                  placeholder={
                    replyingToComment ? "Write a reply…" : "Write a comment…"
                  }
                  maxLength={COMMENT_MAX_LENGTH}
                  className="vintage-input flex-1 px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  className="vintage-btn p-2"
                  disabled={!commentDraft.trim()}
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center justify-between gap-2 px-1">
                {commentError ? (
                  <p className="text-xs text-vintage-rust">{commentError}</p>
                ) : (
                  <span />
                )}
                <span
                  className={`text-xs ${
                    commentDraft.length > COMMENT_MAX_LENGTH * 0.9
                      ? "text-vintage-rust"
                      : "text-vintage-ink-muted"
                  }`}
                >
                  {commentDraft.length}/{COMMENT_MAX_LENGTH}
                </span>
              </div>
            </form>
          </div>
        )}
      </div>
    </article>
  );
}
