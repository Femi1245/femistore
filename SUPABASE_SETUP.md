# Supabase setup for iTunes chat

## 1. Environment variables

Create `.env.local` in the project root (not `.env.local.example`):

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Get both from **Supabase Dashboard → Project Settings → API**.

Restart the dev server after saving: `npm run dev`

## 2. Create database tables (required)

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project
2. Go to **SQL Editor** → **New query**
3. Copy the entire contents of `supabase/schema.sql` and click **Run**

This creates `profiles`, `conversations`, `messages`, and security rules.

## 3. Auth settings

In **Authentication → URL Configuration**:

- **Site URL**: `http://localhost:3000`
- **Redirect URLs**: add `http://localhost:3000/auth/callback`

For easier local testing, in **Authentication → Providers → Email**:

- Turn **off** “Confirm email” (optional; keeps sign-up instant)

## 4. Social features (profiles, posts, follows)

Run `supabase/social-schema.sql` in the SQL Editor (after `schema.sql`).

This adds follows, posts, likes, comments, reshares, and storage for avatars/media.

## 5. Test

1. Visit http://localhost:3000/signup
2. Create an account
3. Edit profile at `/profile/edit` (avatar, bio, birthday)
4. Post on `/feed`, follow users via **Connect** on their profile

If sign-up fails, check the yellow setup banner on the login/signup page.
