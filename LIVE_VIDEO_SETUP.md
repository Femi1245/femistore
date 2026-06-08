# Live video setup (LiveKit)

## 1. Create a LiveKit project

1. Sign up at [cloud.livekit.io](https://cloud.livekit.io) (free tier available)
2. Create a project
3. Copy from **Settings → Keys**:
   - WebSocket URL → `NEXT_PUBLIC_LIVEKIT_URL`
   - API Key → `LIVEKIT_API_KEY`
   - API Secret → `LIVEKIT_API_SECRET`

## 2. Add to `.env.local`

```env
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=APIxxxxxxxx
LIVEKIT_API_SECRET=xxxxxxxx
```

Restart `npm run dev` after saving.

## 3. Supabase table

Run `supabase/live-schema.sql` in the Supabase SQL Editor.

## 4. Use live video

- **Live** in the nav → browse who is live
- **Go live** → start your camera stream
- Others click your stream card to watch

Hosts need to allow camera/microphone in the browser.
