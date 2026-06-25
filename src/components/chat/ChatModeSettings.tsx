"use client";

import { useState } from "react";
import Link from "next/link";
import { Briefcase, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { hasBusinessProfile } from "@/lib/business";
import {
  businessChatSettingsFromProfile,
  personalChatSettingsFromProfile,
  updateBusinessChatSettings,
  updatePersonalChatSettings,
  type BusinessChatSettings,
  type PersonalChatSettings,
} from "@/lib/chat-settings";
import { DM_POLICY_LABELS } from "@/lib/privacy";
import type { Profile } from "@/lib/types";

export function ChatModeSettings({ profile }: { profile: Profile }) {
  const isSeller = hasBusinessProfile(profile);
  const [personal, setPersonal] = useState<PersonalChatSettings>(() =>
    personalChatSettingsFromProfile(profile),
  );
  const [business, setBusiness] = useState<BusinessChatSettings>(() =>
    businessChatSettingsFromProfile(profile),
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function savePersonal(patch: Partial<PersonalChatSettings>) {
    setSaving(true);
    setError(null);
    const next = { ...personal, ...patch };
    const { error: saveError } = await updatePersonalChatSettings(
      createClient(),
      profile.id,
      patch,
    );
    setSaving(false);
    if (saveError) {
      setError(saveError);
      return;
    }
    setPersonal(next);
    setMessage("Personal chat settings saved.");
  }

  async function saveBusiness(patch: Partial<BusinessChatSettings>) {
    setSaving(true);
    setError(null);
    const next = { ...business, ...patch };
    const { error: saveError } = await updateBusinessChatSettings(
      createClient(),
      profile.id,
      patch,
    );
    setSaving(false);
    if (saveError) {
      setError(saveError);
      return;
    }
    setBusiness(next);
    setMessage("Seller chat settings saved.");
  }

  return (
    <section id="chat-settings" className="vintage-card space-y-6 p-5">
      <div>
        <h2 className="font-display text-lg font-semibold text-vintage-ink">Chat settings</h2>
        <p className="mt-1 text-sm text-vintage-ink-muted">
          Personal and business messaging use separate inboxes and rules.
          {isSeller && (
            <>
              {" "}
              Open the <strong>Seller</strong> tab in{" "}
              <Link href="/chat" className="text-vintage-rust hover:underline">
                Messages
              </Link>{" "}
              for customer chats.
            </>
          )}
        </p>
      </div>

      {message && <p className="text-sm text-vintage-olive">{message}</p>}
      {error && <p className="text-sm text-vintage-rust">{error}</p>}

      <div className="space-y-4 rounded-xl vintage-card-inset p-4">
        <div className="flex items-center gap-2 text-vintage-rust">
          <MessageCircle className="h-4 w-4" />
          <h3 className="font-semibold text-vintage-ink">Personal messages</h3>
        </div>
        <p className="text-xs text-vintage-ink-muted">
          Friends, family, and your private inbox. Shown under Chats in Messages.
        </p>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase text-vintage-ink-muted">
            Who can message you (personal)
          </label>
          <select
            value={personal.personal_dm_policy}
            disabled={saving}
            onChange={(e) =>
              void savePersonal({
                personal_dm_policy: e.target.value as PersonalChatSettings["personal_dm_policy"],
              })
            }
            className="vintage-input w-full"
          >
            {Object.entries(DM_POLICY_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center justify-between gap-4">
          <span className="text-sm text-vintage-ink">Show last seen</span>
          <input
            type="checkbox"
            checked={personal.show_last_seen}
            disabled={saving}
            onChange={(e) => void savePersonal({ show_last_seen: e.target.checked })}
            className="h-4 w-4 accent-vintage-rust"
          />
        </label>
        <label className="flex items-center justify-between gap-4">
          <span className="text-sm text-vintage-ink">Read receipts (personal)</span>
          <input
            type="checkbox"
            checked={personal.show_read_receipts}
            disabled={saving}
            onChange={(e) => void savePersonal({ show_read_receipts: e.target.checked })}
            className="h-4 w-4 accent-vintage-rust"
          />
        </label>
      </div>

      {isSeller && (
        <div className="space-y-4 rounded-xl border border-vintage-rust/25 bg-vintage-rust/5 p-4">
          <div className="flex items-center gap-2 text-vintage-rust">
            <Briefcase className="h-4 w-4" />
            <h3 className="font-semibold text-vintage-ink">Seller / business messages</h3>
          </div>
          <p className="text-xs text-vintage-ink-muted">
            Customer inquiries land in your Seller inbox. Auto-reply only applies here.
          </p>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-vintage-ink-muted">
              Who can message your business
            </label>
            <select
              value={business.business_dm_policy}
              disabled={saving}
              onChange={(e) =>
                void saveBusiness({
                  business_dm_policy: e.target.value as BusinessChatSettings["business_dm_policy"],
                })
              }
              className="vintage-input w-full"
            >
              {Object.entries(DM_POLICY_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center justify-between gap-4">
            <span className="text-sm text-vintage-ink">Accept customer DMs</span>
            <input
              type="checkbox"
              checked={business.business_contact_enabled}
              disabled={saving}
              onChange={(e) =>
                void saveBusiness({ business_contact_enabled: e.target.checked })
              }
              className="h-4 w-4 accent-vintage-rust"
            />
          </label>
          <label className="flex items-center justify-between gap-4">
            <span className="text-sm text-vintage-ink">Auto-reply to customers</span>
            <input
              type="checkbox"
              checked={business.business_auto_reply_enabled}
              disabled={saving}
              onChange={(e) =>
                void saveBusiness({ business_auto_reply_enabled: e.target.checked })
              }
              className="h-4 w-4 accent-vintage-rust"
            />
          </label>
          {business.business_auto_reply_enabled && (
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-vintage-ink-muted">
                Auto-reply instructions
              </label>
              <textarea
                value={business.business_auto_reply_message}
                disabled={saving}
                onChange={(e) => setBusiness((b) => ({ ...b, business_auto_reply_message: e.target.value }))}
                onBlur={() =>
                  void saveBusiness({
                    business_auto_reply_message: business.business_auto_reply_message,
                  })
                }
                rows={3}
                className="vintage-input w-full resize-y text-sm"
                placeholder="e.g. Thanks for reaching out! We reply within 24 hours…"
              />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
