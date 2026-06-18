"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { REPORT_REASONS, submitReport } from "@/lib/safety";
import type { ReportTargetType } from "@/lib/types";

export function ReportModal({
  targetType,
  targetId,
  targetLabel,
  onClose,
  onDone,
}: {
  targetType: ReportTargetType;
  targetId: string;
  targetLabel: string;
  onClose: () => void;
  onDone?: () => void;
}) {
  const [reason, setReason] = useState<string>(REPORT_REASONS[0]);
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Sign in required.");
      setLoading(false);
      return;
    }

    const { error: submitError } = await submitReport(
      supabase,
      user.id,
      targetType,
      targetId,
      reason,
      details,
    );
    setLoading(false);
    if (submitError) {
      setError(submitError);
      return;
    }
    setSuccess(true);
    onDone?.();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="vintage-card w-full max-w-md p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-vintage-ink">Report</h2>
          <button type="button" onClick={onClose} className="text-vintage-ink-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        {success ? (
          <p className="text-sm text-vintage-ink">
            Thanks — we received your report about {targetLabel}. Our team will review it.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-vintage-ink-muted">Reporting: {targetLabel}</p>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-vintage-ink-muted">
                Reason
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="vintage-input w-full"
              >
                {REPORT_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-vintage-ink-muted">
                Details (optional)
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={3}
                className="vintage-input w-full resize-none"
                placeholder="What happened?"
              />
            </div>
            {error && <p className="text-sm text-vintage-rust">{error}</p>}
            <button type="submit" disabled={loading} className="vintage-btn w-full py-2.5">
              {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Submit report"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
