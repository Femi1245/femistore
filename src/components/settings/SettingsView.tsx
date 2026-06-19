"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Download, Loader2, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  DM_POLICY_LABELS,
  PROFILE_THEMES,
  privacyFromProfile,
  updatePrivacySettings,
  type PrivacySettings,
} from "@/lib/privacy";
import {
  NOTIFICATION_TYPES,
  loadNotificationPreferences,
  setNotificationPreference,
} from "@/lib/notification-prefs";
import {
  addKeywordMute,
  loadKeywordMutes,
  removeKeywordMute,
} from "@/lib/content-filters";
import { loadMyAppeals, submitAppeal } from "@/lib/safety";
import { MobileAppearanceSection } from "@/components/settings/MobileAppearanceSection";
import type { AccountAppeal, KeywordMute, NotificationType, Profile } from "@/lib/types";

export function SettingsView({ profile }: { profile: Profile }) {
  const [privacy, setPrivacy] = useState<PrivacySettings>(() => privacyFromProfile(profile));
  const [notifPrefs, setNotifPrefs] = useState<Record<NotificationType, boolean> | null>(null);
  const [keywords, setKeywords] = useState<KeywordMute[]>([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [appeals, setAppeals] = useState<AccountAppeal[]>([]);
  const [appealSubject, setAppealSubject] = useState("");
  const [appealMessage, setAppealMessage] = useState("");
  const [appealRef, setAppealRef] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const [prefs, mutes, appealRows] = await Promise.all([
      loadNotificationPreferences(supabase, profile.id),
      loadKeywordMutes(supabase, profile.id),
      loadMyAppeals(supabase, profile.id),
    ]);
    setNotifPrefs(prefs);
    setKeywords(mutes);
    setAppeals(appealRows as AccountAppeal[]);
  }, [profile.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function savePrivacy(patch: Partial<PrivacySettings>) {
    setSaving(true);
    setError(null);
    const next = { ...privacy, ...patch };
    const { error: saveError } = await updatePrivacySettings(
      createClient(),
      profile.id,
      patch,
    );
    setSaving(false);
    if (saveError) {
      setError(saveError);
      return;
    }
    setPrivacy(next);
    setMessage("Settings saved.");
  }

  async function handleExport() {
    setExporting(true);
    setError(null);
    try {
      const res = await fetch("/api/account/export");
      if (!res.ok) throw new Error("Export failed.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `zumelia-export-${profile.username}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Could not export data. Try again.");
    }
    setExporting(false);
  }

  async function handleAppeal(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const { referenceId, error: appealError } = await submitAppeal(
      createClient(),
      profile.id,
      appealSubject,
      appealMessage,
    );
    setSaving(false);
    if (appealError) {
      setError(appealError);
      return;
    }
    setAppealRef(referenceId ?? null);
    setAppealSubject("");
    setAppealMessage("");
    await refresh();
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-vintage-rust/10 text-vintage-rust">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-vintage-ink">Privacy & safety</h1>
          <p className="text-sm text-vintage-ink-muted">
            Control who sees you, who can message you, and what you see.
          </p>
        </div>
      </div>

      {message && (
        <p className="rounded-lg bg-vintage-olive/15 px-3 py-2 text-sm text-vintage-ink">{message}</p>
      )}
      {error && (
        <p className="rounded-lg bg-vintage-rust/10 px-3 py-2 text-sm text-vintage-rust">{error}</p>
      )}

      <MobileAppearanceSection />

      <section className="vintage-card p-5 space-y-3">
        <h2 className="font-display font-bold text-vintage-ink">Profile</h2>
        <p className="text-sm text-vintage-ink-muted">
          Set your birthday so friends can celebrate with you on your profile.
        </p>
        <Link
          href="/profile/birthday"
          className="vintage-btn-outline inline-flex px-4 py-2 text-sm font-semibold"
        >
          🎂 Birthday settings
        </Link>
      </section>

      <section className="vintage-card p-5 space-y-4">
        <h2 className="font-display font-bold text-vintage-ink">Privacy</h2>
        <label className="flex items-center justify-between gap-4">
          <span className="text-sm text-vintage-ink">Private account</span>
          <input
            type="checkbox"
            checked={privacy.is_private}
            onChange={(e) => void savePrivacy({ is_private: e.target.checked })}
            className="h-4 w-4 accent-vintage-rust"
          />
        </label>
        <p className="text-xs text-vintage-ink-muted">
          When private, only followers can see your full profile and posts.
        </p>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase text-vintage-ink-muted">
            Who can message you
          </label>
          <select
            value={privacy.dm_policy}
            onChange={(e) =>
              void savePrivacy({
                dm_policy: e.target.value as PrivacySettings["dm_policy"],
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
            checked={privacy.show_last_seen}
            onChange={(e) => void savePrivacy({ show_last_seen: e.target.checked })}
            className="h-4 w-4 accent-vintage-rust"
          />
        </label>
        <label className="flex items-center justify-between gap-4">
          <span className="text-sm text-vintage-ink">Show read receipts</span>
          <input
            type="checkbox"
            checked={privacy.show_read_receipts}
            onChange={(e) => void savePrivacy({ show_read_receipts: e.target.checked })}
            className="h-4 w-4 accent-vintage-rust"
          />
        </label>
        <label className="flex items-center justify-between gap-4">
          <span className="text-sm text-vintage-ink">Zumelia AI assistant</span>
          <input
            type="checkbox"
            checked={privacy.ai_assistant_enabled}
            onChange={(e) => void savePrivacy({ ai_assistant_enabled: e.target.checked })}
            className="h-4 w-4 accent-vintage-rust"
          />
        </label>
        <label className="flex items-center justify-between gap-4">
          <span className="text-sm text-vintage-ink">Digest mode (fewer pings)</span>
          <input
            type="checkbox"
            checked={privacy.digest_mode}
            onChange={(e) => void savePrivacy({ digest_mode: e.target.checked })}
            className="h-4 w-4 accent-vintage-rust"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-vintage-ink-muted">
              Quiet hours start
            </label>
            <input
              type="time"
              value={privacy.quiet_hours_start?.slice(0, 5) ?? ""}
              onChange={(e) =>
                void savePrivacy({
                  quiet_hours_start: e.target.value ? `${e.target.value}:00` : null,
                })
              }
              className="vintage-input w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-vintage-ink-muted">
              Quiet hours end
            </label>
            <input
              type="time"
              value={privacy.quiet_hours_end?.slice(0, 5) ?? ""}
              onChange={(e) =>
                void savePrivacy({
                  quiet_hours_end: e.target.value ? `${e.target.value}:00` : null,
                })
              }
              className="vintage-input w-full"
            />
          </div>
        </div>
      </section>

      <section className="vintage-card p-5 space-y-4">
        <h2 className="font-display font-bold text-vintage-ink">Profile theme</h2>
        <div className="flex flex-wrap gap-2">
          {PROFILE_THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => void savePrivacy({ profile_theme: t.id })}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                privacy.profile_theme === t.id
                  ? "ring-2 ring-vintage-rust"
                  : "vintage-card-inset"
              }`}
              style={{ borderBottom: `3px solid ${t.accent}` }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <section className="vintage-card p-5 space-y-3">
        <h2 className="font-display font-bold text-vintage-ink">Notifications</h2>
        {notifPrefs &&
          NOTIFICATION_TYPES.map(({ type, label }) => (
            <label key={type} className="flex items-center justify-between gap-4">
              <span className="text-sm text-vintage-ink">{label}</span>
              <input
                type="checkbox"
                checked={notifPrefs[type]}
                onChange={async (e) => {
                  const enabled = e.target.checked;
                  await setNotificationPreference(
                    createClient(),
                    profile.id,
                    type,
                    enabled,
                  );
                  setNotifPrefs((p) => (p ? { ...p, [type]: enabled } : p));
                }}
                className="h-4 w-4 accent-vintage-rust"
              />
            </label>
          ))}
      </section>

      <section className="vintage-card p-5 space-y-3">
        <h2 className="font-display font-bold text-vintage-ink">Muted keywords</h2>
        <p className="text-xs text-vintage-ink-muted">
          Posts containing these words are hidden from your feed.
        </p>
        <form
          className="flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const { error: kwError } = await addKeywordMute(
              createClient(),
              profile.id,
              newKeyword,
            );
            if (!kwError) {
              setNewKeyword("");
              await refresh();
            }
          }}
        >
          <input
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            placeholder="e.g. spoilers"
            className="vintage-input flex-1"
          />
          <button type="submit" className="vintage-btn px-4">
            Add
          </button>
        </form>
        <ul className="space-y-1">
          {keywords.map((k) => (
            <li
              key={k.id}
              className="flex items-center justify-between rounded-lg vintage-card-inset px-3 py-2 text-sm"
            >
              {k.keyword}
              <button
                type="button"
                className="text-vintage-rust text-xs font-semibold"
                onClick={async () => {
                  await removeKeywordMute(createClient(), profile.id, k.id);
                  await refresh();
                }}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="vintage-card p-5 space-y-4">
        <h2 className="font-display font-bold text-vintage-ink">Account support</h2>
        <p className="text-sm text-vintage-ink-muted">
          Suspended or locked out? Submit an appeal — we respond with a reference ID you can track.
        </p>
        <form onSubmit={handleAppeal} className="space-y-3">
          <input
            value={appealSubject}
            onChange={(e) => setAppealSubject(e.target.value)}
            placeholder="Subject"
            className="vintage-input w-full"
            required
          />
          <textarea
            value={appealMessage}
            onChange={(e) => setAppealMessage(e.target.value)}
            placeholder="Describe your issue…"
            rows={4}
            className="vintage-input w-full resize-none"
            required
          />
          <button type="submit" disabled={saving} className="vintage-btn px-4 py-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit appeal"}
          </button>
        </form>
        {appealRef && (
          <p className="text-sm text-vintage-ink">
            Reference ID: <strong>{appealRef}</strong> — save this for follow-up.
          </p>
        )}
        {appeals.length > 0 && (
          <ul className="space-y-2 text-sm">
            {appeals.map((a) => (
              <li key={a.id} className="vintage-card-inset rounded-lg px-3 py-2">
                <span className="font-semibold">{a.subject}</span> — {a.status}
                <span className="block text-xs text-vintage-ink-muted">Ref: {a.reference_id}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="vintage-card p-5 space-y-3">
        <h2 className="font-display font-bold text-vintage-ink">Your data</h2>
        <button
          type="button"
          onClick={() => void handleExport()}
          disabled={exporting}
          className="vintage-btn-outline flex items-center gap-2 px-4 py-2 text-sm"
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Download my data (JSON)
        </button>
        <p className="text-xs text-vintage-ink-muted">
          Includes profile, posts, and notifications. To delete your account, contact support via
          appeal or email support@zumelia.app.
        </p>
        <Link href="/profile/edit" className="text-sm font-semibold text-vintage-rust hover:underline">
          ← Back to edit profile
        </Link>
      </section>

      {saving && (
        <p className="text-center text-xs text-vintage-ink-muted">Saving…</p>
      )}
    </div>
  );
}
