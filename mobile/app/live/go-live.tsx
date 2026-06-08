import { useState } from "react";
import { Text } from "react-native";
import { router } from "expo-router";
import { Btn, ErrorText, Input, Screen, Subtitle, Title } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import { getApiUrl, startLiveStream } from "@/lib/api";

export default function GoLiveScreen() {
  const { session } = useAuth();
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    if (!title.trim()) return;
    if (!session?.access_token) {
      setError("You must be signed in to go live.");
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: apiError } = await startLiveStream(
      title.trim(),
      session.access_token,
    );
    setLoading(false);
    if (apiError || !data?.stream?.room_name) {
      setError(
        apiError ??
          `Could not start live. Ensure the web API is running at ${getApiUrl()}`,
      );
      return;
    }
    router.replace(`/live/${data.stream.room_name}`);
  }

  return (
    <Screen>
      <Title>Go live</Title>
      <Subtitle>Start a live stream for your followers</Subtitle>
      <Input value={title} onChangeText={setTitle} placeholder="Stream title" />
      {error ? <ErrorText>{error}</ErrorText> : null}
      <Btn
        label={loading ? "Starting…" : "Start live stream"}
        onPress={handleStart}
        disabled={loading || !title.trim()}
      />
      <Text style={{ marginTop: 16, fontSize: 12, color: "#6b5344" }}>
        Video broadcasting uses your deployed API for LiveKit tokens. Native video
        will be added in a future update — chat works now in the live room.
      </Text>
    </Screen>
  );
}
