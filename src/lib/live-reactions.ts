/** Ephemeral live reactions over LiveKit data messages (no DB). */

export const LIVE_REACTION_TOPIC = "zumelia.live.reaction";

export const LIVE_REACTION_EMOJIS = [
  "❤️",
  "🔥",
  "😂",
  "👏",
  "😮",
  "🎉",
  "💯",
  "🎮",
] as const;

export type LiveReactionEmoji = (typeof LIVE_REACTION_EMOJIS)[number];

export type LiveReactionPayload = {
  v: 1;
  type: "reaction";
  emoji: string;
  from: string;
  name?: string;
  at: number;
};

export function isLiveReactionEmoji(value: string): value is LiveReactionEmoji {
  return (LIVE_REACTION_EMOJIS as readonly string[]).includes(value);
}

export function encodeLiveReaction(
  emoji: string,
  from: string,
  name?: string,
): Uint8Array {
  const payload: LiveReactionPayload = {
    v: 1,
    type: "reaction",
    emoji,
    from,
    name,
    at: Date.now(),
  };
  return new TextEncoder().encode(JSON.stringify(payload));
}

export function decodeLiveReaction(
  data: Uint8Array,
): LiveReactionPayload | null {
  try {
    const raw = JSON.parse(new TextDecoder().decode(data)) as LiveReactionPayload;
    if (raw?.v !== 1 || raw.type !== "reaction" || !raw.emoji || !raw.from) {
      return null;
    }
    return raw;
  } catch {
    return null;
  }
}
