"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatPhoneE164 } from "@/lib/format-phone-e164";
import {
  maskPhone,
  sendPhoneVerificationOtp,
  verifyPhoneOtp,
} from "@/lib/phone";
import { PHONE_COUNTRIES, dialCodeForCountry } from "@/lib/phone-countries";
import type { Profile } from "@/lib/types";

export function PhoneVerification({
  profile,
  onVerified,
}: {
  profile: Profile;
  onVerified?: () => void;
}) {
  const [phone, setPhone] = useState(profile.phone_e164 ?? "");
  const [dialCode, setDialCode] = useState(
    () => dialCodeForCountry(profile.country) ?? "+234",
  );
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"idle" | "otp">("idle");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const verified = !!profile.phone_verified_at && !!profile.phone_e164;
  const preview = useMemo(
    () => formatPhoneE164(phone, dialCode),
    [phone, dialCode],
  );

  async function handleSendOtp() {
    setLoading(true);
    setError(null);
    setSuccess(null);

    const { error: sendError } = await sendPhoneVerificationOtp(
      createClient(),
      phone,
      dialCode,
    );
    setLoading(false);

    if (sendError) {
      setError(sendError);
      return;
    }

    setStep("otp");
    setSuccess(
      preview
        ? `Verification code sent to ${preview}. Check your SMS.`
        : "Verification code sent. Check your SMS.",
    );
  }

  async function handleVerifyOtp() {
    setLoading(true);
    setError(null);

    const { error: verifyError } = await verifyPhoneOtp(
      createClient(),
      phone,
      otp,
      dialCode,
    );
    setLoading(false);

    if (verifyError) {
      setError(verifyError);
      return;
    }

    setSuccess("Phone verified! You can now find friends by number.");
    setStep("idle");
    setOtp("");
    onVerified?.();
  }

  return (
    <div className="vintage-card-inset space-y-4 p-4">
      <div className="flex items-center gap-2">
        <Phone className="h-4 w-4 text-vintage-rust" />
        <h3 className="font-display text-sm font-bold">Phone number</h3>
      </div>

      {verified ? (
        <div className="flex items-center gap-2 text-sm text-vintage-olive">
          <CheckCircle2 className="h-4 w-4" />
          Verified: {maskPhone(profile.phone_e164!)}
        </div>
      ) : (
        <p className="text-xs text-vintage-ink-muted">
          Verify your number to find and message friends by phone. Pick your
          country, then enter your local number — we add the country code for
          you.
        </p>
      )}

      {!verified && (
        <>
          {step === "idle" ? (
            <div className="space-y-3">
              <select
                value={dialCode}
                onChange={(e) => setDialCode(e.target.value)}
                className="vintage-input w-full px-3 py-2 text-sm"
                aria-label="Country code"
              >
                {PHONE_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.dial}>
                    {c.name} ({c.dial})
                  </option>
                ))}
              </select>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (!loading && phone.trim() && preview) handleSendOtp();
                  }
                }}
                placeholder="e.g. 08012345678"
                inputMode="tel"
                autoComplete="tel"
                className="vintage-input w-full px-3 py-2 text-sm"
              />
              <p className="text-[11px] text-vintage-ink-muted">
                {preview
                  ? `Will send to: ${preview}`
                  : "Enter your local number. Example for Nigeria: 08012345678"}
              </p>
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={loading || !phone.trim() || !preview}
                className="vintage-btn w-full py-2 text-sm disabled:opacity-50"
              >
                {loading ? "Sending…" : "Send verification code"}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (!loading && otp.length >= 4) handleVerifyOtp();
                  }
                }}
                placeholder="6-digit code"
                maxLength={6}
                inputMode="numeric"
                className="vintage-input w-full px-3 py-2 text-sm"
              />
              <p className="text-[11px] text-vintage-ink-muted">
                Didn&apos;t get a code? Check the number is correct, wait a
                minute, then go back and resend.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep("idle")}
                  className="vintage-btn-outline flex-1 py-2 text-sm"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={loading || otp.length < 4}
                  className="vintage-btn flex-1 py-2 text-sm disabled:opacity-50"
                >
                  {loading ? "Verifying…" : "Verify"}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {error && <p className="text-xs text-vintage-rust">{error}</p>}
      {success && <p className="text-xs text-vintage-olive">{success}</p>}
    </div>
  );
}
