import { useState } from "react";
import { ScrollView } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { PhoneVerification } from "@/components/PhoneVerification";
import { Btn, ErrorText, Input, Screen, Title } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import { uploadMediaFromUri } from "@/lib/storage";
import { getSupabase } from "@/lib/supabase";

export default function EditProfileScreen() {
  const { profile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [country, setCountry] = useState(profile?.country ?? "Global");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!profile) return;
    setLoading(true);
    setError(null);
    const { error: updateError } = await getSupabase()
      .from("profiles")
      .update({ display_name: displayName.trim(), bio: bio.trim(), country: country.trim() })
      .eq("id", profile.id);
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    await refreshProfile();
    router.back();
  }

  async function changeAvatar() {
    if (!profile) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const uploaded = await uploadMediaFromUri(
      getSupabase(),
      "avatars",
      profile.id,
      asset.uri,
      asset.mimeType ?? "image/jpeg",
    );
    if (uploaded.url) {
      await getSupabase()
        .from("profiles")
        .update({ avatar_url: uploaded.url })
        .eq("id", profile.id);
      await refreshProfile();
    }
  }

  if (!profile) return null;

  return (
    <Screen>
      <ScrollView>
        <Title>Edit profile</Title>
        <Btn label="Change photo" onPress={changeAvatar} variant="outline" />
        <Input value={displayName} onChangeText={setDisplayName} placeholder="Display name" />
        <Input value={bio} onChangeText={setBio} placeholder="Bio" multiline style={{ minHeight: 80 }} />
        <Input value={country} onChangeText={setCountry} placeholder="Country" />
        <PhoneVerification profile={profile} onVerified={refreshProfile} />
        {error ? <ErrorText>{error}</ErrorText> : null}
        <Btn label={loading ? "Saving…" : "Save changes"} onPress={save} disabled={loading} />
      </ScrollView>
    </Screen>
  );
}
