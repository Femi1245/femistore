# Zumelia Android APK (standalone app)

Zumelia has a **native Android app** in the `mobile/` folder (Expo + React Native). Users install the APK and open **Zumelia directly** — they do **not** need to visit the website in Chrome first.

> **Do not use the Capacitor web wrapper for distribution.** The `capacitor.config.ts` shell loads your website in a WebView and feels like a browser. Use the Expo app below for a real installable APK.

---

## What users get

- Tap the **Zumelia** icon → sign in → chat, feed, live, games
- **Email/password** login works fully inside the app
- **Google / GitHub / X** open a short in-app sign-in sheet, then return to Zumelia automatically (`zumelia://auth/callback`)
- Session is stored securely on the device (not in the browser)

---

## One-time setup (you, the developer)

### 1. Mobile environment

```bash
cd mobile
cp .env.example .env
```

Edit `mobile/.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://mjyjuaisupsgkuavuybz.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_API_URL=https://itunes-mu.vercel.app
```

### 2. Supabase redirect URL

In **Supabase → Authentication → URL Configuration → Redirect URLs**, add:

```
zumelia://auth/callback
```

Keep your web URLs (`https://itunes-mu.vercel.app/auth/callback`, `http://localhost:3000/auth/callback`) for the website.

### 3. Expo / EAS account

```bash
cd mobile
npm install
npx eas login
npx eas init
```

`eas init` links the project to Expo and adds a `projectId` to `app.config.ts`.

### 4. EAS environment (for cloud builds)

Set secrets so the APK embeds your Supabase keys:

```bash
cd mobile
npx eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://mjyjuaisupsgkuavuybz.supabase.co" --environment preview
npx eas env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your-anon-key" --environment preview
npx eas env:create --name EXPO_PUBLIC_API_URL --value "https://itunes-mu.vercel.app" --environment preview
```

Repeat for the `production` environment when you ship to Play Store.

Also add push notification env for cloud builds:

```bash
npx eas env:create --name EXPO_PUBLIC_EAS_PROJECT_ID --value "your-eas-project-id" --environment preview
```

Get `your-eas-project-id` from `npx eas init` or [expo.dev](https://expo.dev) → your project.

---

## Phone push notifications

Push alerts (likes, messages, live, etc.) need three pieces:

### 1. Server (Vercel)

Deploy the latest web app, then in **Vercel → Settings → Environment Variables** add:

```
PUSH_WEBHOOK_SECRET=<same as CRON_SECRET or a new random string>
```

Run from repo root to verify:

```bash
npm run push:setup
```

### 2. Supabase trigger (one-time)

The database trigger is in `supabase/push-dispatch-trigger.sql`. If not applied yet, run it in **Supabase → SQL Editor**.

Then store the webhook secret (use the same value as `PUSH_WEBHOOK_SECRET` in `.env.local`):

```sql
insert into private.push_config (key, value)
values ('webhook_secret', 'your-secret-here')
on conflict (key) do update set value = excluded.value;
```

New notifications will automatically POST to `https://itunes-mu.vercel.app/api/push/dispatch`.

### 3. Mobile app

Add to `mobile/.env`:

```env
EXPO_PUBLIC_EAS_PROJECT_ID=your-eas-project-id
```

Log in and link the Expo project:

```bash
cd mobile
npx eas login
npx eas init
```

**Rebuild the APK** — push does not work in Expo Go on a real device long-term:

```bash
npm run mobile:apk
```

For Android push delivery, configure **FCM credentials** when EAS prompts during build (`eas credentials`).

On first open after install, the app asks for notification permission. Alerts respect quiet hours and per-type settings from the web app.

---

## Build the APK

### Cloud build (recommended)

From the repo root:

```bash
npm run mobile:apk
```

Or from `mobile/`:

```bash
npm run build:apk
```

When the build finishes, EAS prints a **download link** for the `.apk`. Share that file — users install it and open Zumelia like any other app.

### Local build (Android Studio required)

```bash
cd mobile
npx expo prebuild --platform android
cd android
./gradlew assembleDebug
```

Debug APK path:

`mobile/android/app/build/outputs/apk/debug/app-debug.apk`

For Play Store release, use `assembleRelease` with a signing keystore (see [Expo Android build docs](https://docs.expo.dev/build-reference/apk/)).

---

## Test on a phone

1. Install the APK (enable “Install unknown apps” if sideloading).
2. Open **Zumelia** from the app drawer — not Chrome.
3. Sign in with email or OAuth.
4. You should land in **Chat** without opening a browser tab.

---

## Troubleshooting

| Problem | Fix |
|--------|-----|
| “Missing EXPO_PUBLIC_SUPABASE_URL” on launch | Rebuild APK after setting EAS env vars or `mobile/.env` for local builds |
| OAuth opens browser but never returns | Add `zumelia://auth/callback` in Supabase redirect URLs |
| OAuth works in Expo Go but not APK | Expo Go uses `exp://…`; production APK uses `zumelia://` — both URLs can be added in Supabase |
| Live / calls fail | `EXPO_PUBLIC_API_URL` must point to your deployed Next.js API (Vercel) |
| No push notifications | Deploy push API routes, set `PUSH_WEBHOOK_SECRET` on Vercel, run SQL in `push-dispatch-trigger.sql`, rebuild APK with `EXPO_PUBLIC_EAS_PROJECT_ID` |
| Push token error / missing projectId | Run `npx eas init` in `mobile/` and set `EXPO_PUBLIC_EAS_PROJECT_ID` in `.env` + EAS env |
| Users still told to “install from browser” | That banner is for the **website PWA** only; it is hidden inside native shells |

---

## Website vs APK

| | Website (PWA) | APK (`mobile/`) |
|---|---------------|-----------------|
| Install | Browser → Add to Home Screen | Download `.apk` |
| Technology | Next.js | React Native (Expo) |
| Best for | Desktop + quick web access | Android users who want a real app icon |

Both share the same Supabase backend and Vercel API.
