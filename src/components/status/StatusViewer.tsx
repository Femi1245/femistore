"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { markStatusViewed, statusTimeLeft } from "@/lib/status";
import type { StatusGroup, StatusUpdate } from "@/lib/types";
import { Avatar } from "@/components/Avatar";

const SLIDE_MS = 5000;

export function StatusViewer({
  groups,
  startGroupIndex,
  viewerId,
  onClose,
  onAddStatus,
}: {
  groups: StatusGroup[];
  startGroupIndex: number;
  viewerId: string;
  onClose: () => void;
  onAddStatus?: () => void;
}) {
  const [groupIndex, setGroupIndex] = useState(startGroupIndex);
  const [itemIndex, setItemIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const group = groups[groupIndex];
  const item = group?.items[itemIndex];

  const goNext = useCallback(() => {
    if (!group) return;

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
  }, [group, groupIndex, groups, itemIndex, onClose]);

  const goPrev = useCallback(() => {
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
  }, [groupIndex, groups, itemIndex]);

  useEffect(() => {
    if (!item || group.isOwn) return;
    markStatusViewed(createClient(), item.id, viewerId).catch(() => {});
  }, [item, group?.isOwn, viewerId]);

  useEffect(() => {
    if (!item) return;

    const started = Date.now();
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - started;
      const pct = Math.min(100, (elapsed / SLIDE_MS) * 100);
      setProgress(pct);
      if (elapsed >= SLIDE_MS) goNext();
    }, 50);

    return () => window.clearInterval(timer);
  }, [item, groupIndex, itemIndex, goNext]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev, onClose]);

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
          <div className="flex items-center gap-2">
            <Avatar
              name={group.user.display_name}
              avatarUrl={group.user.avatar_url}
              size="sm"
            />
            <div>
              <p className="text-sm font-semibold text-white">{group.user.display_name}</p>
              <p className="text-xs text-white/70">{statusTimeLeft(item.expires_at)}</p>
            </div>
          </div>
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

        <div className="relative flex flex-1 items-center justify-center">
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

        {item.content && item.media_type !== "text" && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 pt-12">
            <p className="text-center text-sm text-white">{item.content}</p>
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
