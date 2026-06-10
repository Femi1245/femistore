import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Btn, ErrorText, Input } from "@/components/ui";
import { colors, spacing } from "@/constants/theme";
import { getSupabase } from "@/lib/supabase";
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

  async function sendOtp() {
    setLoading(true);
    setError(null);
    const { error: sendError } = await sendPhoneVerificationOtp(getSupabase(), phone);
    setLoading(false);
    if (sendError) {
      setError(sendError);
      return;
    }
    setStep("otp");
    setSuccess("Code sent via SMS.");
  }

  async function verify() {
    setLoading(true);
    setError(null);
    const { error: verifyError } = await verifyPhoneOtp(getSupabase(), phone, otp);
    setLoading(false);
    if (verifyError) {
      setError(verifyError);
      return;
    }
    setSuccess("Phone verified!");
    setStep("idle");
    setOtp("");
    onVerified?.();
  }

  return (
    <View style={styles.box}>
      <Text style={styles.title}>Phone number</Text>
      {verified ? (
        <Text style={styles.verified}>Verified: {maskPhone(profile.phone_e164!)}</Text>
      ) : (
        <>
          <Text style={styles.hint}>
            Verify to find friends by phone. Enable Phone in Supabase Auth providers.
          </Text>
          {step === "idle" ? (
            <>
              <Input value={phone} onChangeText={setPhone} placeholder="+2348012345678" />
              <Btn label={loading ? "Sending…" : "Send code"} onPress={sendOtp} disabled={loading} />
            </>
          ) : (
            <>
              <Input value={otp} onChangeText={setOtp} placeholder="6-digit code" keyboardType="number-pad" />
              <Btn label={loading ? "Verifying…" : "Verify"} onPress={verify} disabled={loading} />
              <Btn label="Back" onPress={() => setStep("idle")} variant="outline" />
            </>
          )}
        </>
      )}
      {error ? <ErrorText>{error}</ErrorText> : null}
      {success ? <Text style={styles.success}>{success}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { marginVertical: spacing.md, padding: spacing.md, borderWidth: 2, borderColor: colors.border, borderRadius: 4, backgroundColor: colors.paper },
  title: { fontWeight: "700", color: colors.ink, marginBottom: spacing.sm },
  hint: { fontSize: 12, color: colors.inkMuted, marginBottom: spacing.sm },
  verified: { color: colors.rust, fontSize: 14 },
  success: { color: colors.rust, marginTop: spacing.sm },
});
