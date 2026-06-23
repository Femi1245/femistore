"use client";

import { useCallback, useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  getTodaysPrompt,
  loadCloseFriendsVibeResponses,
  loadMyVibeResponse,
  saveVibeResponse,
} from "@/lib/vibe-prompts";
import type { Profile, VibeResponse } from "@/lib/types";
import { Avatar } from "@/components/Avatar";

export function VibePromptBanner({ currentUser }: { currentUser: Profile }) {
  const prompt = getTodaysPrompt();
  const [mine, setMine] = useState<VibeResponse | null>(null);
  const [responses, setResponses] = useState<(VibeResponse & { author?: Profile })[]>([]);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [myRow, friendsRows] = await Promise.all([
      loadMyVibeResponse(supabase, currentUser.id, prompt.key),
      loadCloseFriendsVibeResponses(supabase, currentUser.id, prompt.key),
    ]);
    setMine(myRow);
    setText(myRow?.response ?? "");
    setResponses(friendsRows.filter((r) => r.user_id !== currentUser.id));
  }, [currentUser.id, prompt.key]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const { row, error: err } = await saveVibeResponse(
      createClient(),
      currentUser.id,
      prompt.key,
      prompt.text,
      text,
    );
    setSaving(false);
    if (err) {
      setError(err);
      return;
    }
    setMine(row);
    void load();
  }

  return (
    <div className="vintage-card p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-vintage-rust" />
        <h2 className="font-display text-sm font-bold uppercase tracking-wide text-vintage-ink">
          Daily vibe
        </h2>
      </div>
      <p className="font-display text-lg font-semibold text-vintage-ink">{prompt.text}</p>
      <p className="mt-1 text-xs text-vintage-ink-muted">
        Close friends see your answer — low pressure, no likes.
      </p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Share your vibe…"
          maxLength={280}
          className="vintage-input flex-1 px-3 py-2.5 text-sm"
        />
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving || !text.trim()}
          className="vintage-btn shrink-0 px-5 py-2.5 text-sm disabled:opacity-50"
        >
          {saving ? "Saving…" : mine ? "Update" : "Share"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-vintage-rust">{error}</p>}

      {responses.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-vintage-border pt-4">
          <p className="text-xs font-semibold uppercase text-vintage-ink-muted">
            Close friends
          </p>
          {responses.map((r) => (
            <div key={r.id} className="flex items-start gap-2 rounded-lg bg-vintage-paper-dark/40 p-2">
              {r.author && (
                <Avatar
                  name={r.author.display_name}
                  avatarUrl={r.author.avatar_url}
                  size="sm"
                />
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold text-vintage-ink">
                  {r.author?.display_name ?? "Friend"}
                </p>
                <p className="text-sm text-vintage-ink-muted">{r.response}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
