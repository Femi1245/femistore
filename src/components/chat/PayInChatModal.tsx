"use client";

import { useState } from "react";
import { DollarSign, Loader2, X } from "lucide-react";
import type { Profile } from "@/lib/types";

export function PayInChatModal({
  recipient,
  conversationId,
  onClose,
  onSent,
}: {
  recipient: Profile;
  conversationId: string;
  onClose: () => void;
  onSent?: () => void;
}) {
  const [amount, setAmount] = useState("5");
  const [note, setNote] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSend() {
    const dollars = parseFloat(amount);
    if (!Number.isFinite(dollars) || dollars < 1) {
      setError("Enter at least 1.00");
      return;
    }

    setSending(true);
    setError(null);

    const res = await fetch("/api/payments/chat-send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationId,
        recipientId: recipient.id,
        amountCents: Math.round(dollars * 100),
        currency,
        note,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setSending(false);
      setError(data.error ?? "Payment failed");
      return;
    }

    if (data.authorization_url) {
      window.location.href = data.authorization_url;
      return;
    }

    setSending(false);
    setSuccess(data.paymentNote ?? "Payment sent!");
    onSent?.();
    setTimeout(onClose, 1500);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="vintage-card w-full max-w-md p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-vintage-ink">
            Send money to {recipient.display_name}
          </h2>
          <button type="button" onClick={onClose} className="nav-icon-btn" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <label className="col-span-2 block">
              <span className="mb-1 block text-xs font-semibold text-vintage-ink-muted">
                Amount
              </span>
              <input
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="vintage-input w-full px-3 py-2.5 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-vintage-ink-muted">
                Currency
              </span>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="vintage-input w-full px-2 py-2.5 text-sm"
              >
                <option value="USD">USD</option>
                <option value="NGN">NGN</option>
              </select>
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-vintage-ink-muted">
              Note (optional)
            </span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="For lunch, thanks, etc."
              className="vintage-input w-full px-3 py-2.5 text-sm"
              maxLength={200}
            />
          </label>
        </div>

        {error && (
          <p className="mt-3 text-sm text-vintage-rust">{error}</p>
        )}
        {success && (
          <p className="mt-3 text-sm text-vintage-olive">{success}</p>
        )}

        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={sending}
          className="vintage-btn mt-5 flex w-full items-center justify-center gap-2 py-2.5 text-sm disabled:opacity-50"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <DollarSign className="h-4 w-4" />
          )}
          {sending ? "Processing…" : "Send payment"}
        </button>
      </div>
    </div>
  );
}
