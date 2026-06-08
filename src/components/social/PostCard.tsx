"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import {
  Heart,
  MessageCircle,
  Repeat2,
  Send,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  addComment,
  formatPostDate,
  loadComments,
  resharePost,
  toggleLike,
} from "@/lib/social";
import type { Comment, PostWithMeta, Profile } from "@/lib/types";
import { Avatar } from "@/components/Avatar";

function PostBody({ post }: { post: PostWithMeta }) {
  const target = post.original_post ?? post;

  return (
    <>
      {post.reshare_of && post.content && (
        <p className="mb-2 text-sm text-vintage-ink-muted">{post.content}</p>
      )}
      {target.content && (
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{target.content}</p>
      )}
      {target.media_url && target.media_type === "image" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={target.media_url}
          alt=""
          className="mt-3 max-h-96 w-full rounded-xl object-cover"
        />
      )}
      {target.media_url && target.media_type === "video" && (
        <video
          src={target.media_url}
          controls
          className="mt-3 max-h-96 w-full rounded-xl"
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
  const [loadingComments, setLoadingComments] = useState(false);
  const [reshareOpen, setReshareOpen] = useState(false);
  const [reshareCaption, setReshareCaption] = useState("");

  const author = post.author;
  const rootId = post.reshare_of ?? post.id;

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
    await addComment(createClient(), rootId, currentUser.id, commentDraft.trim());
    setCommentDraft("");
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

  if (!author) return null;

  return (
    <article className="vintage-card p-4">
      <div className="flex items-start gap-3">
        <Link href={`/profile/${author.username}`}>
          <Avatar
            name={author.display_name}
            avatarUrl={author.avatar_url}
          />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/profile/${author.username}`}
              className="font-semibold hover:text-vintage-rust"
            >
              {author.display_name}
            </Link>
            <span className="text-vintage-ink-muted">@{author.username}</span>
            <span className="text-xs text-vintage-ink-muted/70">
              · {formatPostDate(post.created_at)}
            </span>
          </div>
          {post.reshare_of && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-vintage-rust">
              <Repeat2 className="h-3 w-3" /> Reshared
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 pl-0 sm:pl-[52px]">
        <PostBody post={post} />

        <div className="mt-4 flex items-center gap-1 border-t border-vintage-border/50 pt-3">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition ${
              engagement.liked_by_me
                ? "text-vintage-rust"
                : "text-vintage-ink-muted hover:bg-vintage-paper-dark/50"
            }`}
          >
            <Heart
              className={`h-4 w-4 ${engagement.liked_by_me ? "fill-current" : ""}`}
            />
            {engagement.likes || ""}
          </button>
          <button
            onClick={toggleComments}
            className="flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm text-vintage-ink-muted hover:bg-vintage-paper-dark/50"
          >
            <MessageCircle className="h-4 w-4" />
            {engagement.comments || ""}
          </button>
          <button
            onClick={() => setReshareOpen(!reshareOpen)}
            disabled={engagement.reshared_by_me}
            className="flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm text-vintage-ink-muted hover:bg-vintage-paper-dark/50 disabled:opacity-40"
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
                <div key={c.id} className="flex gap-2">
                  <Avatar
                    name={c.author?.display_name ?? "?"}
                    avatarUrl={c.author?.avatar_url}
                    size="sm"
                  />
                  <div className="vintage-card-inset px-3 py-2 text-sm flex-1">
                    <p className="font-medium text-vintage-rust">
                      {c.author?.display_name}
                    </p>
                    <p>{c.content}</p>
                  </div>
                </div>
              ))
            )}
            <form onSubmit={handleComment} className="flex gap-2">
              <input
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                placeholder="Write a comment…"
                className="vintage-input flex-1 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="vintage-btn p-2"
                disabled={!commentDraft.trim()}
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        )}
      </div>
    </article>
  );
}
