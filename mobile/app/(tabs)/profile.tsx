import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Avatar } from "@/components/Avatar";
import { Btn, Loader, Screen } from "@/components/ui";
import { colors, spacing } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";

export default function ProfileTab() {
  const { profile, signOut } = useAuth();

  if (!profile) return <Loader />;

  return (
    <Screen>
      <View style={styles.header}>
        <Avatar name={profile.display_name} avatarUrl={profile.avatar_url} size="xl" />
        <Text style={styles.name}>{profile.display_name}</Text>
        <Text style={styles.username}>@{profile.username}</Text>
        <Text style={styles.country}>{profile.country}</Text>
        {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
      </View>

      <Btn
        label="View full profile"
        onPress={() => router.push(`/profile/${profile.username}`)}
      />
      <View style={{ height: spacing.sm }} />
      <Btn label="Edit profile" onPress={() => router.push("/profile/edit")} variant="outline" />
      <View style={{ height: spacing.sm }} />
      <Pressable onPress={signOut}>
        <Text style={styles.signOut}>Sign out</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", marginBottom: spacing.lg },
  name: { fontSize: 24, fontWeight: "700", color: colors.ink, marginTop: spacing.sm },
  username: { color: colors.rust, fontWeight: "600" },
  country: { color: colors.inkMuted, marginTop: 4 },
  bio: { textAlign: "center", color: colors.ink, marginTop: spacing.sm, lineHeight: 20 },
  signOut: { textAlign: "center", color: colors.rust, fontWeight: "600", marginTop: spacing.lg },
});
