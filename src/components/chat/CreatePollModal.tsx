"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createGroupPoll } from "@/lib/polls";

export function CreatePollModal({
  conversationId,
  userId,
  onClose,
  onCreated,
}: {
  conversationId: string;
  userId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [anonymous, setAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: pollError } = await createGroupPoll(
      createClient(),
      userId,
      conversationId,
      question,
      options,
      { anonymous },
    );
    setLoading(false);
    if (pollError) {
      setError(pollError);
      return;
    }
    onCreated();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="vintage-card w-full max-w-md p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Create poll</h2>
          <button type="button" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Question"
            className="vintage-input w-full"
            required
          />
          {options.map((opt, i) => (
            <input
              key={i}
              value={opt}
              onChange={(e) => {
                const next = [...options];
                next[i] = e.target.value;
                setOptions(next);
              }}
              placeholder={`Option ${i + 1}`}
              className="vintage-input w-full"
            />
          ))}
          <button
            type="button"
            className="text-sm text-vintage-rust"
            onClick={() => setOptions((o) => [...o, ""])}
          >
            + Add option
          </button>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
            />
            Anonymous votes
          </label>
          {error && <p className="text-sm text-vintage-rust">{error}</p>}
          <button type="submit" disabled={loading} className="vintage-btn w-full py-2">
            {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Post poll"}
          </button>
        </form>
      </div>
    </div>
  );
}
