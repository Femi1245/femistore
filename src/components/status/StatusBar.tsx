"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { loadStatusGroups } from "@/lib/status";
import type { Profile, StatusGroup } from "@/lib/types";
import { StatusCreateModal } from "@/components/status/StatusCreateModal";
import { StatusRing } from "@/components/status/StatusRing";
import { StatusViewer } from "@/components/status/StatusViewer";

export function StatusBar({ user }: { user: Profile }) {
  const [groups, setGroups] = useState<StatusGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [viewGroupIndex, setViewGroupIndex] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await loadStatusGroups(createClient(), user.id);
    setGroups(data);
    setLoading(false);
  }, [user.id]);

  useEffect(() => {
    refresh();
    const interval = window.setInterval(refresh, 60000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  function handleRingClick(group: StatusGroup) {
    if (group.isOwn && group.items.length === 0) {
      setShowCreate(true);
      return;
    }

    if (group.items.length === 0) return;

    const playable = visibleGroups.filter((g) => g.items.length > 0);
    const index = playable.findIndex((g) => g.user.id === group.user.id);
    if (index >= 0) setViewGroupIndex(index);
  }

  const visibleGroups = groups.filter((g) => g.isOwn || g.items.length > 0);
  const playableGroups = visibleGroups.filter((g) => g.items.length > 0);

  if (!loading && visibleGroups.length === 0) {
    return (
      <>
        <div className="border-b border-vintage-border bg-vintage-paper/95">
          <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
            <StatusRing
              user={user}
              hasUnseen={false}
              hasStatus={false}
              isOwn
              onClick={() => setShowCreate(true)}
            />
            <p className="text-xs text-vintage-ink-muted">
              Add a status — visible to friends for 24 hours
            </p>
          </div>
        </div>
        {showCreate && (
          <StatusCreateModal
            userId={user.id}
            onClose={() => setShowCreate(false)}
            onCreated={refresh}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="sticky top-14 z-40 border-b border-vintage-border bg-vintage-paper/95 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-4 py-3">
          <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex w-[4.5rem] shrink-0 flex-col items-center gap-1.5">
                  <div className="skeleton skeleton-circle h-14 w-14" />
                  <div className="skeleton h-2 w-10" />
                </div>
              ))
            ) : (
              visibleGroups.map((group, index) => (
                <StatusRing
                  key={group.user.id}
                  user={group.user}
                  hasUnseen={group.hasUnseen}
                  hasStatus={group.items.length > 0}
                  isOwn={group.isOwn}
                  onClick={() => handleRingClick(group)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {showCreate && (
        <StatusCreateModal
          userId={user.id}
          onClose={() => setShowCreate(false)}
          onCreated={refresh}
        />
      )}

      {viewGroupIndex !== null && playableGroups.length > 0 && (
        <StatusViewer
          groups={playableGroups}
          startGroupIndex={viewGroupIndex}
          viewerId={user.id}
          onAddStatus={() => {
            setViewGroupIndex(null);
            setShowCreate(true);
          }}
          onClose={() => {
            setViewGroupIndex(null);
            refresh();
          }}
        />
      )}
    </>
  );
}
