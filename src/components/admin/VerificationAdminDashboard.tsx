"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  Check,
  ChevronLeft,
  ExternalLink,
  Loader2,
  Shield,
  X,
} from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { SearchWithSuggestions } from "@/components/search/SearchWithSuggestions";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import {
  VERIFICATION_CATEGORIES,
  verificationCategoryLabel,
} from "@/lib/verification";
import type { Profile, VerificationCategory, VerificationRequest } from "@/lib/types";

type RequestRow = VerificationRequest & {
  profiles?: Pick<
    Profile,
    "id" | "username" | "display_name" | "avatar_url" | "is_verified"
  > | null;
};

type VerifiedUser = Pick<
  Profile,
  "id" | "username" | "display_name" | "avatar_url" | "verified_category" | "verified_at" | "country"
>;

type Tab = "pending" | "verified" | "grant";

export function VerificationAdminDashboard() {
  const [tab, setTab] = useState<Tab>("pending");
  const [pending, setPending] = useState<RequestRow[]>([]);
  const [verified, setVerified] = useState<VerifiedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<
    (VerifiedUser & { is_verified?: boolean })[]
  >([]);
  const [searching, setSearching] = useState(false);
  const [grantCategory, setGrantCategory] = useState<VerificationCategory>("celebrity");
  const [grantUserId, setGrantUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pendingRes, verifiedRes] = await Promise.all([
        fetch("/api/admin/verification/requests?status=pending"),
        fetch("/api/admin/verification/verified"),
      ]);

      const pendingData = (await pendingRes.json().catch(() => ({}))) as {
        requests?: RequestRow[];
        error?: string;
      };
      const verifiedData = (await verifiedRes.json().catch(() => ({}))) as {
        users?: VerifiedUser[];
        error?: string;
      };

      if (!pendingRes.ok) {
        throw new Error(
          pendingData.error ?? `Could not load pending requests (${pendingRes.status})`,
        );
      }
      if (!verifiedRes.ok) {
        throw new Error(
          verifiedData.error ?? `Could not load verified users (${verifiedRes.status})`,
        );
      }

      setPending(pendingData.requests ?? []);
      setVerified(verifiedData.users ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function runSearch() {
    const q = searchQ.trim();
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const res = await fetch(`/api/admin/users/search?q=${encodeURIComponent(q)}`);
    const data = (await res.json()) as { users?: VerifiedUser[]; error?: string };
    setSearching(false);
    if (!res.ok) {
      setError(data.error ?? "Search failed");
      return;
    }
    setSearchResults(data.users ?? []);
  }

  async function approveRequest(requestId: string) {
    setActionId(requestId);
    setError(null);
    const res = await fetch("/api/admin/verification/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId }),
    });
    const data = (await res.json()) as { error?: string };
    setActionId(null);
    if (!res.ok) {
      setError(data.error ?? "Approve failed");
      return;
    }
    await load();
  }

  async function rejectRequest(requestId: string) {
    const note = window.prompt("Optional note for rejection (internal):") ?? "";
    setActionId(requestId);
    setError(null);
    const res = await fetch("/api/admin/verification/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, adminNote: note }),
    });
    const data = (await res.json()) as { error?: string };
    setActionId(null);
    if (!res.ok) {
      setError(data.error ?? "Reject failed");
      return;
    }
    await load();
  }

  async function revokeUser(userId: string, username: string) {
    if (!window.confirm(`Remove verified badge from @${username}?`)) return;
    setActionId(userId);
    setError(null);
    const res = await fetch("/api/admin/verification/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    const data = (await res.json()) as { error?: string };
    setActionId(null);
    if (!res.ok) {
      setError(data.error ?? "Revoke failed");
      return;
    }
    await load();
  }

  async function grantVerification() {
    if (!grantUserId) return;
    setActionId(grantUserId);
    setError(null);
    const res = await fetch("/api/admin/verification/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: grantUserId, category: grantCategory }),
    });
    const data = (await res.json()) as { error?: string };
    setActionId(null);
    if (!res.ok) {
      setError(data.error ?? "Grant failed");
      return;
    }
    setGrantUserId(null);
    setSearchQ("");
    setSearchResults([]);
    await load();
    setTab("verified");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/admin"
            className="mb-3 inline-flex items-center gap-1 text-sm text-vintage-ink-muted hover:text-vintage-rust"
          >
            <ChevronLeft className="h-4 w-4" /> Admin home
          </Link>
          <div className="flex items-center gap-2 text-vintage-rust">
            <Shield className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Admin</span>
          </div>
          <h1 className="font-display mt-1 text-2xl font-bold text-vintage-ink">
            Verified accounts
          </h1>
          <p className="mt-1 text-sm text-vintage-ink-muted">
            Review requests and verify famous or notable people on Zumelia.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="vintage-btn-outline px-3 py-2 text-sm"
        >
          Refresh
        </button>
      </div>

      {error && (
        <p className="rounded-xl border border-vintage-rust/30 bg-vintage-rust/10 px-4 py-3 text-sm text-vintage-rust">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["pending", `Pending (${pending.length})`],
            ["verified", `Verified (${verified.length})`],
            ["grant", "Grant directly"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              tab === id
                ? "vintage-btn"
                : "vintage-btn-outline"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-vintage-ink-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading…
        </div>
      ) : tab === "pending" ? (
        pending.length === 0 ? (
          <p className="vintage-card px-6 py-12 text-center text-sm text-vintage-ink-muted">
            No pending verification requests.
          </p>
        ) : (
          <ul className="space-y-4">
            {pending.map((req) => {
              const profile = req.profiles;
              const busy = actionId === req.id;
              return (
                <li key={req.id} className="vintage-card p-4 sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <Avatar
                        name={profile?.display_name ?? "User"}
                        avatarUrl={profile?.avatar_url ?? null}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/profile/${profile?.username ?? ""}`}
                            className="font-semibold hover:text-vintage-rust"
                          >
                            {profile?.display_name ?? "Unknown"}
                          </Link>
                          <span className="text-sm text-vintage-ink-muted">
                            @{profile?.username}
                          </span>
                          <span className="rounded-full bg-vintage-paper-dark px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-vintage-ink-muted">
                            {verificationCategoryLabel(req.category)}
                          </span>
                        </div>
                        {req.applicant_note && (
                          <p className="mt-2 whitespace-pre-wrap text-sm text-vintage-ink">
                            {req.applicant_note}
                          </p>
                        )}
                        {req.public_links?.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {req.public_links.map((link) => (
                              <li key={link}>
                                <a
                                  href={link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-vintage-rust hover:underline"
                                >
                                  {link}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </li>
                            ))}
                          </ul>
                        )}
                        <p className="mt-2 text-[10px] text-vintage-ink-muted">
                          Submitted {new Date(req.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void approveRequest(req.id)}
                        className="vintage-btn flex items-center gap-1 px-3 py-2 text-sm disabled:opacity-50"
                      >
                        {busy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void rejectRequest(req.id)}
                        className="vintage-btn-outline flex items-center gap-1 px-3 py-2 text-sm text-vintage-rust disabled:opacity-50"
                      >
                        <X className="h-4 w-4" /> Reject
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )
      ) : tab === "verified" ? (
        verified.length === 0 ? (
          <p className="vintage-card px-6 py-12 text-center text-sm text-vintage-ink-muted">
            No verified accounts yet.
          </p>
        ) : (
          <ul className="vintage-card divide-y divide-vintage-border">
            {verified.map((u) => {
              const busy = actionId === u.id;
              return (
                <li
                  key={u.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={u.display_name} avatarUrl={u.avatar_url} />
                    <div className="min-w-0">
                      <p className="flex items-center gap-1 font-semibold">
                        {u.display_name}
                        <VerifiedBadge category={u.verified_category} size="xs" />
                      </p>
                      <p className="text-xs text-vintage-ink-muted">
                        @{u.username}
                        {u.verified_category
                          ? ` · ${verificationCategoryLabel(u.verified_category)}`
                          : ""}
                        {u.verified_at
                          ? ` · since ${new Date(u.verified_at).toLocaleDateString()}`
                          : ""}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void revokeUser(u.id, u.username)}
                    className="vintage-btn-outline px-3 py-1.5 text-xs text-vintage-rust disabled:opacity-50"
                  >
                    Revoke
                  </button>
                </li>
              );
            })}
          </ul>
        )
      ) : (
        <div className="vintage-card space-y-4 p-5">
          <p className="text-sm text-vintage-ink-muted">
            Search for a user and grant verification without a request — for famous people you
            onboard directly.
          </p>
          <div className="flex gap-2">
          <div className="min-w-0 flex-1">
            <SearchWithSuggestions
              scope="people"
              value={searchQ}
              onChange={setSearchQ}
              placeholder="Search username or name…"
              onSuggestionSelect={(s) => {
                setGrantUserId(s.id);
                setSearchResults([
                  {
                    id: s.id,
                    username: s.sublabel?.replace(/^@/, "").split(" · ")[0] ?? "",
                    display_name: s.label,
                    avatar_url: s.avatarUrl ?? null,
                    verified_category: null,
                    verified_at: null,
                    country: "",
                  },
                ]);
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => void runSearch()}
            disabled={searching}
            className="vintage-btn shrink-0 px-4 py-2 text-sm disabled:opacity-50"
          >
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
          </button>
        </div>

          {searchResults.length > 0 && (
            <ul className="space-y-2">
              {searchResults.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => setGrantUserId(u.id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                      grantUserId === u.id
                        ? "bg-vintage-rust/15 ring-1 ring-vintage-rust/40"
                        : "hover:bg-vintage-paper-dark/50"
                    }`}
                  >
                    <Avatar name={u.display_name} avatarUrl={u.avatar_url} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{u.display_name}</p>
                      <p className="text-xs text-vintage-ink-muted">@{u.username}</p>
                    </div>
                    {u.is_verified && (
                      <span className="flex items-center gap-1 text-xs text-sky-600">
                        <BadgeCheck className="h-4 w-4" /> Verified
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {grantUserId && (
            <div className="border-t border-vintage-border pt-4">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-vintage-ink-muted">
                Category
              </label>
              <select
                value={grantCategory}
                onChange={(e) => setGrantCategory(e.target.value as VerificationCategory)}
                className="vintage-input mb-4 w-full px-3 py-2 text-sm"
              >
                {VERIFICATION_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label} — {c.description}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={actionId === grantUserId}
                onClick={() => void grantVerification()}
                className="vintage-btn flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-50"
              >
                {actionId === grantUserId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <BadgeCheck className="h-4 w-4" />
                )}
                Grant verified badge
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
