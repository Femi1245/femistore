"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, LifeBuoy, Mail } from "lucide-react";
import {
  getSupportMailtoHref,
  SUPPORT_CATEGORIES,
  type SupportCategory,
} from "@/lib/support";
import type { Profile } from "@/lib/types";

type SupportFormProps = {
  profile?: Profile | null;
  accountEmail?: string | null;
};

export function SupportForm({ profile, accountEmail }: SupportFormProps) {
  const [name, setName] = useState(profile?.display_name ?? "");
  const [email, setEmail] = useState(accountEmail ?? "");
  const [category, setCategory] = useState<SupportCategory>("general");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [emailFallback, setEmailFallback] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    setEmailFallback(false);

    try {
      const res = await fetch("/api/support/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          category,
          subject,
          message,
        }),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        emailNotConfigured?: boolean;
      };

      if (!res.ok || !data.ok) {
        if (data.emailNotConfigured) {
          setEmailFallback(true);
          setError(
            "Email delivery is not set up yet. You can email us directly using the button below.",
          );
        } else {
          setError(data.error ?? "Could not send your message. Try again.");
        }
        return;
      }

      setSent(true);
      setSubject("");
      setMessage("");
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="vintage-card p-8 text-center space-y-4">
        <CheckCircle2 className="mx-auto h-12 w-12 text-vintage-olive" />
        <h2 className="font-display text-2xl font-bold text-vintage-ink">
          Message sent
        </h2>
        <p className="text-sm leading-relaxed text-vintage-ink-muted">
          Thanks for reaching out. We received your message and will reply to{" "}
          <strong className="text-vintage-ink">{email.trim()}</strong> as soon as we can.
        </p>
        <Link href={profile ? "/feed" : "/"} className="vintage-btn inline-flex px-6 py-2.5 text-sm">
          {profile ? "Back to feed" : "Back home"}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-vintage-rust/10 text-vintage-rust">
          <LifeBuoy className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-vintage-ink">Support</h1>
          <p className="mt-1 text-sm leading-relaxed text-vintage-ink-muted">
            Questions, bugs, account help, or feedback — send us a message and we&apos;ll get back
            to you by email.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="vintage-card space-y-4 p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5 text-sm">
            <span className="font-semibold text-vintage-ink">Your name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="vintage-input w-full px-3 py-2.5"
              placeholder="How should we address you?"
              required
              maxLength={80}
            />
          </label>
          <label className="block space-y-1.5 text-sm">
            <span className="font-semibold text-vintage-ink">Your email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="vintage-input w-full px-3 py-2.5"
              placeholder="you@example.com"
              required
              maxLength={120}
            />
          </label>
        </div>

        <label className="block space-y-1.5 text-sm">
          <span className="font-semibold text-vintage-ink">Category</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as SupportCategory)}
            className="vintage-input w-full px-3 py-2.5"
          >
            {SUPPORT_CATEGORIES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5 text-sm">
          <span className="font-semibold text-vintage-ink">Subject</span>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="vintage-input w-full px-3 py-2.5"
            placeholder="Brief summary of your issue"
            required
            maxLength={120}
          />
        </label>

        <label className="block space-y-1.5 text-sm">
          <span className="font-semibold text-vintage-ink">Message</span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="vintage-input min-h-[160px] w-full resize-y px-3 py-2.5"
            placeholder="Tell us what happened, what you expected, and any steps to reproduce…"
            required
            maxLength={4000}
          />
        </label>

        {profile && (
          <p className="text-xs text-vintage-ink-muted">
            Sending as @{profile.username}. Your profile details will be included so we can help
            faster.
          </p>
        )}

        {error && (
          <p className="rounded-lg border border-vintage-rust/30 bg-vintage-rust/5 px-3 py-2 text-sm text-vintage-ink">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="submit"
            disabled={sending}
            className="vintage-btn inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            Send message
          </button>
          {emailFallback && (
            <a href={getSupportMailtoHref()} className="vintage-btn-outline px-5 py-2.5 text-sm">
              Email us directly
            </a>
          )}
        </div>
      </form>

      <p className="text-center text-xs text-vintage-ink-muted">
        Typical response time: 1–2 business days.
      </p>
    </div>
  );
}
