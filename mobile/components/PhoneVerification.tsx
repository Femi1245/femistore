import { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Btn, ErrorText, Input } from "@/components/ui";
import { colors, spacing } from "@/constants/theme";
import { getSupabase } from "@/lib/supabase";
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"idle" | "otp">("idle");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const verified = !!profile.phone_verified_at && !!profile.phone_e164;

  const selectedCountry = useMemo(
    () => PHONE_COUNTRIES.find((c) => c.dial === dialCode),
    [dialCode],
  );

  const filteredCountries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return PHONE_COUNTRIES;
    return PHONE_COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.dial.includes(q),
    );
  }, [search]);

  async function sendOtp() {
    setLoading(true);
    setError(null);
    const { error: sendError } = await sendPhoneVerificationOtp(
      getSupabase(),
      phone,
      dialCode,
    );
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
    const { error: verifyError } = await verifyPhoneOtp(
      getSupabase(),
      phone,
      otp,
      dialCode,
    );
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
            Pick your country, then enter your local number — the country code is
            added for you.
          </Text>
          {step === "idle" ? (
            <>
              <Pressable
                style={styles.countryBtn}
                onPress={() => setPickerOpen(true)}
              >
                <Text style={styles.countryBtnText}>
                  {selectedCountry
                    ? `${selectedCountry.name} (${selectedCountry.dial})`
                    : dialCode}
                </Text>
                <Text style={styles.countryBtnChevron}>▾</Text>
              </Pressable>
              <Input
                value={phone}
                onChangeText={setPhone}
                placeholder="Phone number"
                keyboardType="phone-pad"
              />
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

      <Modal
        visible={pickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setPickerOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Select country</Text>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search country or code"
              placeholderTextColor={colors.inkMuted}
              style={styles.search}
            />
            <FlatList
              data={filteredCountries}
              keyExtractor={(c) => c.code}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable
                  style={styles.countryRow}
                  onPress={() => {
                    setDialCode(item.dial);
                    setPickerOpen(false);
                    setSearch("");
                  }}
                >
                  <Text style={styles.countryName}>{item.name}</Text>
                  <Text style={styles.countryDial}>{item.dial}</Text>
                </Pressable>
              )}
            />
            <Btn label="Close" variant="outline" onPress={() => setPickerOpen(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { marginVertical: spacing.md, padding: spacing.md, borderWidth: 2, borderColor: colors.border, borderRadius: 4, backgroundColor: colors.paper },
  title: { fontWeight: "700", color: colors.ink, marginBottom: spacing.sm },
  hint: { fontSize: 12, color: colors.inkMuted, marginBottom: spacing.sm },
  verified: { color: colors.rust, fontSize: 14 },
  success: { color: colors.rust, marginTop: spacing.sm },
  countryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    backgroundColor: colors.paper,
  },
  countryBtnText: { color: colors.ink, fontSize: 14 },
  countryBtnChevron: { color: colors.inkMuted, fontSize: 12 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    maxHeight: "75%",
    backgroundColor: colors.paper,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    padding: spacing.md,
    gap: spacing.sm,
  },
  modalTitle: { fontWeight: "700", color: colors.ink, fontSize: 16 },
  search: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.ink,
  },
  countryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  countryName: { color: colors.ink, fontSize: 14, flex: 1, paddingRight: spacing.sm },
  countryDial: { color: colors.inkMuted, fontSize: 14 },
});
