"use client";

import { useState } from "react";
import { CheckCircle2, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  maskPhone,
  sendPhoneVerificationOtp,
  verifyPhoneOtp,
} from "@/lib/phone";
import type { Profile } from "@/lib/types";

export function PhoneVerification({
  profile,
  onVerified,
}: {
  profile: Profile;
  onVerified?: () => void;
}) {
  const [phone, setPhone] = useState(profile.phone_e164 ?? "");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"idle" | "otp">("idle");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const verified = !!profile.phone_verified_at && !!profile.phone_e164;

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const { error: sendError } = await sendPhoneVerificationOtp(createClient(), phone);
    setLoading(false);

    if (sendError) {
      setError(sendError);
      return;
    }

    setStep("otp");
    setSuccess("Verification code sent. Check your SMS.");
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: verifyError } = await verifyPhoneOtp(createClient(), phone, otp);
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
          Verify your number to find and message friends by phone. Enable Phone auth in
          Supabase → Authentication → Providers.
        </p>
      )}

      {!verified && (
        <>
          {step === "idle" ? (
            <form onSubmit={handleSendOtp} className="space-y-3">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+2348012345678"
                className="vintage-input w-full px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={loading || !phone.trim()}
                className="vintage-btn w-full py-2 text-sm disabled:opacity-50"
              >
                {loading ? "Sending…" : "Send verification code"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-3">
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="6-digit code"
                maxLength={6}
                className="vintage-input w-full px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep("idle")}
                  className="vintage-btn-outline flex-1 py-2 text-sm"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || otp.length < 4}
                  className="vintage-btn flex-1 py-2 text-sm disabled:opacity-50"
                >
                  {loading ? "Verifying…" : "Verify"}
                </button>
              </div>
            </form>
          )}
        </>
      )}

      {error && <p className="text-xs text-vintage-rust">{error}</p>}
      {success && <p className="text-xs text-vintage-olive">{success}</p>}
    </div>
  );
}
