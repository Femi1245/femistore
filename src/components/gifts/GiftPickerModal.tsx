"use client";

import { useEffect, useState } from "react";
import { Gift, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatGiftPrice, loadGiftCatalog } from "@/lib/gifts";
import type { GiftCatalogItem, GiftContext, Profile } from "@/lib/types";

export function GiftPickerModal({
  recipient,
  context,
  conversationId,
  roomName,
  onClose,
  onSent,
}: {
  recipient: Profile;
  context: GiftContext;
  conversationId?: string;
  roomName?: string;
  onClose: () => void;
  onSent?: (catalog: GiftCatalogItem) => void;
}) {
  const [catalog, setCatalog] = useState<GiftCatalogItem[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadGiftCatalog(createClient()).then((items) => {
      setCatalog(items);
      if (items[0]) setSelected(items[0].id);
      setLoading(false);
    });
  }, []);

  const picked = catalog.find((c) => c.id === selected);

  async function handleSend() {
    if (!selected || !picked) return;
    setSending(true);
    setError(null);
    setSuccess(null);

    const res = await fetch("/api/gifts/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        catalogId: selected,
        recipientId: recipient.id,
        context,
        conversationId,
        roomName,
        note,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setSending(false);
      setError(data.error ?? "Could not send gift");
      return;
    }

    // Real payment: redirect to the secure Paystack checkout.
    if (data.authorization_url) {
      globalThis.location.assign(data.authorization_url);
      return;
    }

    // Demo mode: gift was delivered immediately.
    setSending(false);
    setSuccess(data.paymentNote ?? "Gift sent!");
    onSent?.(picked);
    setTimeout(onClose, 1500);
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/65 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="vintage-card w-full max-w-md border-vintage-border-strong bg-vintage-paper p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="gift-picker-title"
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-vintage-rust" />
            <h2 id="gift-picker-title" className="font-display text-lg font-bold">
              Send a gift
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-vintage-ink-muted transition hover:bg-vintage-paper-dark hover:text-vintage-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-3 text-sm text-vintage-ink-muted">
          To <span className="font-semibold text-vintage-ink">{recipient.display_name}</span>
          {context === "live" ? " during live stream" : ""}
        </p>

        <p className="mb-4 rounded-lg bg-vintage-rust/10 px-3 py-2 text-xs text-vintage-rust">
          Secure checkout via Paystack. You&apos;ll confirm payment on the next screen.
        </p>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-vintage-rust" />
          </div>
        ) : catalog.length === 0 ? (
          <p className="text-sm text-vintage-ink-muted">
            Gift catalog not loaded. Run gifts-schema.sql in Supabase.
          </p>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-3 gap-2">
              {catalog.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelected(item.id)}
                  className={`flex flex-col items-center rounded-lg border-2 p-3 transition-[transform,background-color,border-color,box-shadow] touch-manipulation active:scale-[0.98] ${
                    selected === item.id
                      ? "border-vintage-rust bg-vintage-rust/25 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--vintage-rust)_35%,transparent)]"
                      : "border-vintage-border bg-vintage-paper-dark hover:border-vintage-rust/40 hover:bg-vintage-paper-dark active:bg-vintage-rust/15"
                  }`}
                >
                  <span className="text-2xl">{item.emoji}</span>
                  <span className="mt-1 text-xs font-semibold">{item.name}</span>
                  <span className="text-[10px] text-vintage-ink-muted">
                    {formatGiftPrice(item.price_cents)}
                  </span>
                </button>
              ))}
            </div>

            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note (optional)"
              maxLength={200}
              className="vintage-input mb-4 w-full px-3 py-2 text-sm"
            />

            {picked && (
              <p className="mb-3 text-center text-sm">
                Send {picked.emoji} <strong>{picked.name}</strong> for{" "}
                <strong>{formatGiftPrice(picked.price_cents)}</strong>
              </p>
            )}
          </>
        )}

        {error && <p className="mb-2 text-xs text-vintage-rust">{error}</p>}
        {success && <p className="mb-2 text-xs text-vintage-olive">{success}</p>}

        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="vintage-btn-outline flex-1 py-2 text-sm">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !selected || catalog.length === 0}
            className="vintage-btn flex flex-1 items-center justify-center gap-2 py-2 text-sm disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
            Send gift
          </button>
        </div>
      </div>
    </div>
  );
}
