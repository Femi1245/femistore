# Zumelia standalone Android app (JavaScript + Capacitor)

This is **not Expo**. It is a real Android app icon that opens Zumelia full-screen — **no Chrome address bar**.

## What users get

1. Install `Zumelia.apk` once (from GitHub Releases or the website download page).
2. Tap the **Zumelia** icon on the home screen / app drawer.
3. The app opens immediately — no “enter browser first”.

## Download link (after the first CI build)

**Direct APK:**  
https://github.com/Femi1245/femistore/releases/latest/download/Zumelia.apk

**Releases page:**  
https://github.com/Femi1245/femistore/releases/latest

## How the APK is built

GitHub Actions workflow: `.github/workflows/android-apk.yml`

- Runs on push to `main` when Android/Capacitor files change
- Or run manually: GitHub → **Actions** → **Build Zumelia Android APK** → **Run workflow**

## Local build (optional — needs Android Studio)

```bash
npm install
npx cap sync android
npx cap open android
```

In Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**

## Website

After the release exists, set on Vercel (optional — defaults to the GitHub link in code):

```
NEXT_PUBLIC_ANDROID_APK_URL=https://github.com/Femi1245/femistore/releases/latest/download/Zumelia.apk
```

Install guide page: https://itunes-mu.vercel.app/download

## Google / X / GitHub sign-in (required once)

OAuth uses Google/X/GitHub's secure Android Custom Tab, then returns directly
to the app through the `zumelia://` deep link.

In **Supabase → Authentication → URL Configuration → Redirect URLs**, add:

```
https://itunes-mu.vercel.app/auth/native-bridge
https://itunes-mu.vercel.app/auth/native-bridge/**
zumelia://auth/callback
```

Site URL can stay `https://itunes-mu.vercel.app`.

`zumelia://auth/callback` is the primary native return URL. The HTTPS entries
remain as a fallback for older APK builds.
