"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Heart,
  MessageCircle,
  Repeat2,
  Send,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getPersonalProfileUrl } from "@/lib/business";
import {
  addStatusComment,
  getStatusEngagement,
  loadStatusComments,
  loadStatusViewers,
  markStatusViewed,
  reshareStatus,
  statusTimeLeft,
  toggleStatusLike,
} from "@/lib/status";
import type {
  StatusComment,
  StatusEngagement,
  StatusGroup,
  StatusUpdate,
  StatusViewerRow,
} from "@/lib/types";
import { Avatar } from "@/components/Avatar";

const SLIDE_MS = 5000;

export function StatusViewer({
  groups,
  startGroupIndex,
  viewerId,
  onClose,
  onAddStatus,
  onReshared,
}: {
  groups: StatusGroup[];
  startGroupIndex: number;
  viewerId: string;
  onClose: () => void;
  onAddStatus?: () => void;
  onReshared?: () => void;
}) {
  const [groupIndex, setGroupIndex] = useState(startGroupIndex);
  const [itemIndex, setItemIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [engagement, setEngagement] = useState<StatusEngagement | null>(null);
  const [panel, setPanel] = useState<"none" | "viewers" | "comments">("none");
  const [viewers, setViewers] = useState<StatusViewerRow[]>([]);
  const [comments, setComments] = useState<StatusComment[]>([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const group = groups[groupIndex];
  const item = group?.items[itemIndex];

  const goNext = useCallback(() => {
    if (!group || panel !== "none") return;

    if (itemIndex < group.items.length - 1) {
      setItemIndex((i) => i + 1);
      setProgress(0);
      return;
    }

    if (groupIndex < groups.length - 1) {
      const nextGroup = groups[groupIndex + 1];
      if (nextGroup.items.length > 0) {
        setGroupIndex((i) => i + 1);
        setItemIndex(0);
        setProgress(0);
        return;
      }
    }

    onClose();
  }, [group, groupIndex, groups, itemIndex, onClose, panel]);

  const goPrev = useCallback(() => {
    if (panel !== "none") return;
    if (itemIndex > 0) {
      setItemIndex((i) => i - 1);
      setProgress(0);
      return;
    }

    if (groupIndex > 0) {
      const prevGroup = groups[groupIndex - 1];
      if (prevGroup.items.length > 0) {
        setGroupIndex((i) => i - 1);
        setItemIndex(prevGroup.items.length - 1);
        setProgress(0);
      }
    }
  }, [groupIndex, groups, itemIndex, panel]);

  useEffect(() => {
    if (!item || group.isOwn) return;
    markStatusViewed(createClient(), item.id, viewerId).catch(() => {});
  }, [item, group?.isOwn, viewerId]);

  useEffect(() => {
    if (!item) return;
    setPanel("none");
    setActionError(null);
    setCommentDraft("");
    let cancelled = false;
    void getStatusEngagement(createClient(), item.id, viewerId).then((data) => {
      if (!cancelled) setEngagement(data);
    });
    return () => {
      cancelled = true;
    };
  }, [item?.id, viewerId]);

  useEffect(() => {
    setProgress(0);
  }, [item?.id]);

  useEffect(() => {
    if (!item || paused || panel !== "none") return;

    const started = Date.now();
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - started;
      const pct = Math.min(100, (elapsed / SLIDE_MS) * 100);
      setProgress(pct);
      if (elapsed >= SLIDE_MS) goNext();
    }, 50);

    return () => window.clearInterval(timer);
  }, [item?.id, groupIndex, itemIndex, goNext, paused, panel]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (panel !== "none") {
          setPanel("none");
          return;
        }
        onClose();
      }
      if (panel !== "none") return;
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev, onClose, panel]);

  async function openViewers() {
    if (!item || !group.isOwn) return;
    setPaused(true);
    setPanel("viewers");
    const rows = await loadStatusViewers(createClient(), item.id);
    setViewers(rows);
  }

  async function openComments() {
    if (!item) return;
    setPaused(true);
    setPanel("comments");
    const rows = await loadStatusComments(createClient(), item.id);
    setComments(rows);
  }

  async function handleLike() {
    if (!item || !engagement || busy) return;
    const wasLiked = engagement.liked_by_me;
    setEngagement({
      ...engagement,
      liked_by_me: !wasLiked,
      likes: engagement.likes + (wasLiked ? -1 : 1),
    });
    const { error } = await toggleStatusLike(
      createClient(),
      item.id,
      viewerId,
      wasLiked,
    );
    if (error) {
      setEngagement(engagement);
      setActionError(error);
    }
  }

  async function handleReshare() {
    if (!item || !engagement || busy || group.isOwn) return;
    if (engagement.reshared_by_me) {
      setActionError("You already reshared this status.");
      return;
    }
    setBusy(true);
    setActionError(null);
    const { error } = await reshareStatus(createClient(), item, viewerId);
    setBusy(false);
    if (error) {
      setActionError(error);
      return;
    }
    setEngagement({
      ...engagement,
      reshared_by_me: true,
      reshares: engagement.reshares + 1,
    });
    onReshared?.();
  }

  async function handleSendComment() {
    if (!item || !commentDraft.trim() || busy) return;
    setBusy(true);
    setActionError(null);
    const { comment, error } = await addStatusComment(
      createClient(),
      item.id,
      viewerId,
      commentDraft,
    );
    setBusy(false);
    if (error || !comment) {
      setActionError(error ?? "Could not post comment");
      return;
    }
    setCommentDraft("");
    const rows = await loadStatusComments(createClient(), item.id);
    setComments(rows);
    setEngagement((prev) =>
      prev ? { ...prev, comments: prev.comments + 1 } : prev,
    );
  }

  if (!group || !item) {
    onClose();
    return null;
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95">
      <div className="relative flex h-full w-full max-w-lg flex-col">
        <div className="absolute left-0 right-0 top-0 z-20 flex gap-1 p-3">
          {group.items.map((statusItem, idx) => (
            <div key={statusItem.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/25">
              <div
                className="h-full bg-white transition-[width] duration-100 ease-linear"
                style={{
                  width:
                    idx < itemIndex
                      ? "100%"
                      : idx === itemIndex
                        ? `${progress}%`
                        : "0%",
                }}
              />
            </div>
          ))}
        </div>

        <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between p-4 pt-6">
          <Link
            href={getPersonalProfileUrl(group.user.username)}
            onClick={onClose}
            className="flex min-w-0 items-center gap-2 rounded-lg pr-2 hover:bg-white/10"
          >
            <Avatar
              name={group.user.display_name}
              avatarUrl={group.user.avatar_url}
              size="sm"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {group.user.display_name}
              </p>
              <p className="text-xs text-white/70">{statusTimeLeft(item.expires_at)}</p>
            </div>
          </Link>
          <div className="flex items-center gap-1">
            {group.isOwn && onAddStatus && (
              <button
                type="button"
                onClick={onAddStatus}
                className="rounded-sm bg-white/20 px-3 py-1 text-xs font-semibold text-white hover:bg-white/30"
              >
                Add
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-white/90 hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div
          className="relative flex flex-1 items-center justify-center"
          onPointerDown={() => setPaused(true)}
          onPointerUp={() => panel === "none" && setPaused(false)}
          onPointerLeave={() => panel === "none" && setPaused(false)}
        >
          <StatusSlide item={item} />

          <button
            type="button"
            onClick={goPrev}
            className="absolute left-2 top-1/2 z-20 -translate-y-1/2 rounded-full p-2 text-white/80 hover:bg-white/10"
            aria-label="Previous"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={goNext}
            className="absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-full p-2 text-white/80 hover:bg-white/10"
            aria-label="Next"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-4 pb-5 pt-16">
          {item.content && item.media_type !== "text" && (
            <p className="mb-3 text-center text-sm text-white">{item.content}</p>
          )}
          {item.reshare_of && (
            <p className="mb-2 text-center text-[11px] text-white/60">Reshared status</p>
          )}
          {actionError && (
            <p className="mb-2 text-center text-xs text-red-300">{actionError}</p>
          )}
          <div className="flex items-center justify-between gap-2">
            {group.isOwn ? (
              <button
                type="button"
                onClick={() => void openViewers()}
                className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-2 text-sm text-white hover:bg-white/25"
              >
                <Eye className="h-4 w-4" />
                {engagement?.views ?? 0} viewed
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => void handleLike()}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-white hover:bg-white/15"
                  aria-label={engagement?.liked_by_me ? "Unlike" : "Like"}
                >
                  <Heart
                    className={`h-5 w-5 ${
                      engagement?.liked_by_me ? "fill-red-500 text-red-500" : ""
                    }`}
                  />
                  {engagement && engagement.likes > 0 ? engagement.likes : ""}
                </button>
                <button
                  type="button"
                  onClick={() => void openComments()}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-white hover:bg-white/15"
                  aria-label="Comments"
                >
                  <MessageCircle className="h-5 w-5" />
                  {engagement && engagement.comments > 0 ? engagement.comments : ""}
                </button>
                <button
                  type="button"
                  onClick={() => void handleReshare()}
                  disabled={busy || !!engagement?.reshared_by_me}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-white hover:bg-white/15 disabled:opacity-50"
                  aria-label="Reshare"
                >
                  <Repeat2
                    className={`h-5 w-5 ${
                      engagement?.reshared_by_me ? "text-emerald-400" : ""
                    }`}
                  />
                  {engagement && engagement.reshares > 0 ? engagement.reshares : ""}
                </button>
              </div>
            )}
            {group.isOwn && (
              <div className="flex items-center gap-3 text-xs text-white/80">
                <span className="inline-flex items-center gap-1">
                  <Heart className="h-3.5 w-3.5" /> {engagement?.likes ?? 0}
                </span>
                <button
                  type="button"
                  onClick={() => void openComments()}
                  className="inline-flex items-center gap-1 hover:text-white"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> {engagement?.comments ?? 0}
                </button>
                <span className="inline-flex items-center gap-1">
                  <Repeat2 className="h-3.5 w-3.5" /> {engagement?.reshares ?? 0}
                </span>
              </div>
            )}
          </div>
        </div>

        {panel !== "none" && (
          <div className="absolute inset-x-0 bottom-0 z-30 max-h-[55%] rounded-t-2xl bg-vintage-paper text-vintage-ink shadow-2xl">
            <div className="flex items-center justify-between border-b border-vintage-border px-4 py-3">
              <p className="font-semibold">
                {panel === "viewers" ? "Viewers" : "Comments"}
              </p>
              <button
                type="button"
                onClick={() => {
                  setPanel("none");
                  setPaused(false);
                }}
                className="rounded-full p-1 hover:bg-black/5"
                aria-label="Close panel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto px-4 py-3">
              {panel === "viewers" &&
                (viewers.length === 0 ? (
                  <p className="text-sm text-vintage-ink-muted">No views yet</p>
                ) : (
                  <ul className="space-y-3">
                    {viewers.map((row) => (
                      <li key={row.viewerId} className="flex items-center gap-3">
                        <Avatar
                          name={row.profile?.display_name ?? "Viewer"}
                          avatarUrl={row.profile?.avatar_url}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {row.profile?.display_name ?? "Someone"}
                          </p>
                          <p className="text-[11px] text-vintage-ink-muted">
                            {new Date(row.viewedAt).toLocaleString()}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ))}
              {panel === "comments" &&
                (comments.length === 0 ? (
                  <p className="mb-3 text-sm text-vintage-ink-muted">No comments yet</p>
                ) : (
                  <ul className="mb-3 space-y-3">
                    {comments.map((c) => (
                      <li key={c.id} className="flex gap-2">
                        <Avatar
                          name={c.author?.display_name ?? "Member"}
                          avatarUrl={c.author?.avatar_url}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold">
                            {c.author?.display_name ?? "Member"}
                          </p>
                          <p className="text-sm">{c.content}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ))}
            </div>
            {panel === "comments" && (
              <div className="flex gap-2 border-t border-vintage-border p-3">
                <input
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  placeholder="Write a comment…"
                  maxLength={500}
                  className="vintage-input flex-1 px-3 py-2 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleSendComment();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => void handleSendComment()}
                  disabled={busy || !commentDraft.trim()}
                  className="vintage-btn rounded-lg px-3 py-2 disabled:opacity-50"
                  aria-label="Send comment"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusSlide({ item }: { item: StatusUpdate }) {
  if (item.media_type === "text") {
    return (
      <div
        className="flex h-full w-full items-center justify-center p-8 text-center"
        style={{ backgroundColor: item.background_color }}
      >
        <p className="font-display text-2xl font-bold leading-snug text-white">
          {item.content}
        </p>
      </div>
    );
  }

  if (item.media_type === "image" && item.media_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.media_url}
        alt=""
        className="max-h-full max-w-full object-contain"
      />
    );
  }

  if (item.media_type === "video" && item.media_url) {
    return (
      <video
        src={item.media_url}
        className="max-h-full max-w-full object-contain"
        autoPlay
        playsInline
        muted
        controls={false}
      />
    );
  }

  return null;
}
