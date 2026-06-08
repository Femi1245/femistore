import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Btn, Input } from "@/components/ui";
import { uploadMediaFromUri } from "@/lib/storage";
import { getSupabase } from "@/lib/supabase";
import type { Profile } from "@/lib/types";

export function CreatePost({
  user,
  onPosted,
}: {
  user: Profile;
  onPosted: () => void;
}) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(textOnly = true, media?: { uri: string; mime: string }) {
    if (!content.trim() && textOnly && !media) return;
    setLoading(true);
    setError(null);

    let mediaUrl: string | null = null;
    let mediaType: "image" | "video" | null = null;

    if (media) {
      const uploaded = await uploadMediaFromUri(
        getSupabase(),
        "post-media",
        user.id,
        media.uri,
        media.mime,
      );
      if (uploaded.error) {
        setError(uploaded.error);
        setLoading(false);
        return;
      }
      mediaUrl = uploaded.url;
      mediaType = media.mime.startsWith("video") ? "video" : "image";
    }

    const { error: insertError } = await getSupabase().from("posts").insert({
      user_id: user.id,
      content: content.trim(),
      media_url: mediaUrl,
      media_type: mediaType,
    });

    setLoading(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setContent("");
    onPosted();
  }

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    await submit(false, {
      uri: asset.uri,
      mime: asset.mimeType ?? "image/jpeg",
    });
  }

  return (
    <View style={styles.box}>
      <Input
        value={content}
        onChangeText={setContent}
        placeholder="What's on your mind?"
        multiline
        style={{ minHeight: 72, textAlignVertical: "top" }}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.row}>
        <Btn label="Photo" onPress={pickImage} variant="outline" />
        <Btn
          label={loading ? "Posting…" : "Post"}
          onPress={() => submit()}
          disabled={loading || !content.trim()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: "#ebe0ca",
    borderWidth: 2,
    borderColor: "#a68b6a",
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
  },
  row: { flexDirection: "row", gap: 8, marginTop: 8 },
  error: { color: "#b85c38", fontSize: 13 },
});
