"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { loadPollWithResults, voteOnPoll } from "@/lib/polls";
import type { GroupPoll } from "@/lib/types";

export function PollMessage({
  pollId,
  userId,
}: {
  pollId: string;
  userId: string;
}) {
  const [poll, setPoll] = useState<GroupPoll | null>(null);
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    loadPollWithResults(createClient(), pollId, userId).then(setPoll);
  }, [pollId, userId]);

  if (!poll?.options?.length) {
    return <p className="text-sm italic text-vintage-ink-muted">Loading poll…</p>;
  }

  const totalVotes = poll.options.reduce((s, o) => s + (o.vote_count ?? 0), 0);

  async function handleVote(optionId: string) {
    setVoting(true);
    await voteOnPoll(createClient(), userId, pollId, optionId);
    const refreshed = await loadPollWithResults(createClient(), pollId, userId);
    setPoll(refreshed);
    setVoting(false);
  }

  return (
    <div className="space-y-2 rounded-lg vintage-card-inset p-3">
      <p className="font-semibold text-vintage-ink">{poll.question}</p>
      {poll.options.map((opt) => {
        const count = opt.vote_count ?? 0;
        const pct = totalVotes ? Math.round((count / totalVotes) * 100) : 0;
        return (
          <button
            key={opt.id}
            type="button"
            disabled={voting}
            onClick={() => void handleVote(opt.id)}
            className={`relative w-full overflow-hidden rounded-lg border px-3 py-2 text-left text-sm transition ${
              opt.voted_by_me
                ? "border-vintage-rust bg-vintage-rust/10"
                : "border-vintage-border hover:bg-vintage-paper-dark"
            }`}
          >
            <span
              className="absolute inset-y-0 left-0 bg-vintage-rust/15"
              style={{ width: `${pct}%` }}
            />
            <span className="relative flex justify-between gap-2">
              <span>{opt.label}</span>
              <span className="text-vintage-ink-muted">{pct}%</span>
            </span>
          </button>
        );
      })}
      <p className="text-[10px] text-vintage-ink-muted">{totalVotes} vote{totalVotes !== 1 ? "s" : ""}</p>
    </div>
  );
}
