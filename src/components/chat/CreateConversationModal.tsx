"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  addGroupMembers,
  createChannel,
  createGroup,
  loadMutualFriends,
} from "@/lib/chat";
import type { Profile } from "@/lib/types";
import { Avatar } from "@/components/Avatar";

type Mode = "group" | "channel" | "add-members";

export function CreateConversationModal({
  mode,
  userId,
  convId,
  onClose,
  onCreated,
}: {
  mode: Mode;
  userId: string;
  convId?: string;
  onClose: () => void;
  onCreated: (convId: string) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === "group" || mode === "add-members") {
      loadMutualFriends(createClient(), userId).then(setFriends);
    }
  }, [mode, userId]);

  function toggleMember(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();

    if (mode === "group") {
      const { convId: createdId, error: createError } = await createGroup(
        supabase,
        userId,
        name,
        [...selected],
      );
      setLoading(false);
      if (createError || !createdId) {
        setError(createError ?? "Could not create group.");
        return;
      }
      onCreated(createdId);
      return;
    }

    if (mode === "channel") {
      const { convId: createdId, error: createError } = await createChannel(
        supabase,
        userId,
        name,
        description,
        isPublic,
      );
      setLoading(false);
      if (createError || !createdId) {
        setError(createError ?? "Could not create channel.");
        return;
      }
      onCreated(createdId);
      return;
    }

    if (mode === "add-members" && convId) {
      const { error: addError } = await addGroupMembers(supabase, userId, convId, [
        ...selected,
      ]);
      setLoading(false);
      if (addError) {
        setError(addError);
        return;
      }
      onCreated(convId);
    }
  }

  const title =
    mode === "group"
      ? "Create group"
      : mode === "channel"
        ? "Create channel"
        : "Add members";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="vintage-card w-full max-w-md p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">{title}</h2>
          <button type="button" onClick={onClose} className="text-vintage-ink-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {(mode === "group" || mode === "channel") && (
            <div>
              <label className="mb-1 block text-xs text-vintage-ink-muted">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={80}
                className="vintage-input w-full px-3 py-2 text-sm"
                placeholder={mode === "group" ? "Family chat" : "Announcements"}
              />
            </div>
          )}

          {mode === "channel" && (
            <>
              <div>
                <label className="mb-1 block text-xs text-vintage-ink-muted">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  maxLength={300}
                  className="vintage-input w-full px-3 py-2 text-sm"
                  placeholder="What is this channel about?"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                />
                Public channel (others can join)
              </label>
              <p className="text-xs text-vintage-ink-muted">
                Only you (owner) can post in channels. Subscribers read updates.
              </p>
            </>
          )}

          {(mode === "group" || mode === "add-members") && (
            <div>
              <p className="mb-2 text-xs text-vintage-ink-muted">
                Select friends (mutual connections)
              </p>
              <div className="max-h-48 space-y-2 overflow-y-auto">
                {friends.length === 0 ? (
                  <p className="text-sm text-vintage-ink-muted">
                    No mutual friends yet. Connect with people first.
                  </p>
                ) : (
                  friends.map((friend) => (
                    <label
                      key={friend.id}
                      className="flex cursor-pointer items-center gap-3 rounded-sm p-2 hover:bg-vintage-paper-dark/50"
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(friend.id)}
                        onChange={() => toggleMember(friend.id)}
                      />
                      <Avatar
                        name={friend.display_name}
                        avatarUrl={friend.avatar_url}
                        size="sm"
                      />
                      <span className="text-sm">{friend.display_name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          {error && <p className="text-xs text-vintage-rust">{error}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="vintage-btn-outline flex-1 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="vintage-btn flex-1 py-2 text-sm disabled:opacity-50"
            >
              {loading ? "Saving…" : mode === "add-members" ? "Add" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
