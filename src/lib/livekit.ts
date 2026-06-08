import { AccessToken } from "livekit-server-sdk";

export function isLiveKitConfigured(): boolean {
  return !!(
    process.env.LIVEKIT_API_KEY &&
    process.env.LIVEKIT_API_SECRET &&
    process.env.NEXT_PUBLIC_LIVEKIT_URL
  );
}

export async function createLiveKitToken(options: {
  roomName: string;
  identity: string;
  name: string;
  canPublish: boolean;
}) {
  const apiKey = process.env.LIVEKIT_API_KEY!;
  const apiSecret = process.env.LIVEKIT_API_SECRET!;

  const token = new AccessToken(apiKey, apiSecret, {
    identity: options.identity,
    name: options.name,
    ttl: "4h",
  });

  token.addGrant({
    roomJoin: true,
    room: options.roomName,
    canPublish: options.canPublish,
    canSubscribe: true,
    canPublishData: true,
  });

  return await token.toJwt();
}

export function getLiveKitUrl(): string {
  return process.env.NEXT_PUBLIC_LIVEKIT_URL ?? "";
}
