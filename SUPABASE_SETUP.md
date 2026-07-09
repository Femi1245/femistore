# Supabase setup for Zumelia chat

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

Run `supabase/verify-setup.sql` anytime to see which tables or columns are still **MISSING**.

## 3. Auth settings

In **Authentication → URL Configuration**:

| Setting | Local dev | Production |
|---------|-----------|------------|
| **Site URL** | `http://localhost:3000` | `https://itunes-mu.vercel.app` |
| **Redirect URLs** | `http://localhost:3000/auth/callback` | `https://itunes-mu.vercel.app/auth/callback` |

Add **both** redirect URLs so Google/GitHub/X work locally and on Vercel.

**Social sign-in (Google, GitHub, X):** enable each provider under **Authentication → Providers**. In Google Cloud / GitHub / X developer settings, set the provider callback to your Supabase URL:

`https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`

For easier local testing, in **Authentication → Providers → Email**:

- Turn **off** “Confirm email” (optional; keeps sign-up instant)

### Phone verification (profile + find friends by number)

Zumelia sends SMS codes through **Supabase Auth** when users verify at **Edit profile** (`/profile/edit`), then **Chat → Phone** can find friends by number.

#### Step A — Enable Phone + Twilio in Supabase

1. **Authentication → Providers → Phone** → turn **Enable Phone provider** on
2. Under **SMS provider**, choose **Twilio** (or **Twilio Verify**)
3. From [twilio.com](https://www.twilio.com) console, copy:
   - **Account SID**
   - **Auth Token**
   - A **phone number** you bought on Twilio (trial numbers work for verified test mobiles), **or** a **Messaging Service SID**
4. Paste into Supabase Phone settings → **Save**

**Free dev option:** add [test phone numbers + fixed OTP](https://supabase.com/docs/guides/auth/phone-login) in Supabase Phone settings (no real SMS cost).

#### Step B — Database (one-time)

Run `supabase/phone-groups-channels-schema.sql` in the SQL Editor (adds `phone_e164`, `sync_my_verified_phone`, `find_user_by_phone`).

#### Step C — Number format (E.164) — common error fix

Supabase requires **international E.164** format. This is the most common failure even when Phone is already ON.

| You type | Sent to Supabase | Result |
|----------|------------------|--------|
| `+2348012345678` | `+2348012345678` | Correct |
| `2348012345678` | `+2348012345678` | OK (app adds `+`) |
| `08012345678` | `+2348012345678` | OK (app converts NG local → international) |
| `080…` without enough digits | — | Rejected |
| `8012345678` (no country code) | `+8012345678` | **Invalid** — always include `+234` |

If you see **`Invalid phone number format (E.164 required)`**, use `+234…` not a bare local `080…` unless it is a full 11-digit Nigerian mobile.

#### Step D — Test on the site

1. Log in → **Edit profile** (`/profile/edit`)
2. Scroll to **Phone number**
3. Enter e.g. `+2348012345678` → **Send verification code**
4. Enter the 6-digit SMS code → **Verify**
5. Open **Chat → Phone** → search by number (you and the other person must both be verified)

#### Phone troubleshooting

| Error / symptom | Fix |
|-----------------|-----|
| `Invalid phone number format (E.164 required)` | Use `+2348012345678` (country code + number). See table above. |
| `Phone provider is not enabled` | **Authentication → Providers → Phone** → enable |
| `Error sending sms` / `sms Provider could not be found` | Connect **Twilio** credentials in Phone provider settings and Save |
| Code never arrives | Twilio trial only sends to **verified** numbers in Twilio console; or use Supabase test numbers |
| `Token has expired or is invalid` | Enter the latest code within ~60s; request a new code |
| Chat “Find by phone” finds nobody | Both users must complete verification; numbers must match E.164 |

## 4. Social features (profiles, posts, follows)

Run `supabase/social-schema.sql` in the SQL Editor (after `schema.sql`).

This adds follows, posts, likes, comments, reshares, and storage for avatars/media.

## 5. Test

1. Visit http://localhost:3000/signup
2. Create an account
3. Edit profile at `/profile/edit` (avatar, bio, birthday, **phone**)
4. Post on `/feed`, follow users via **Connect** on their profile

If sign-up fails, check the yellow setup banner on the login/signup page.

## 6. Email automation (welcome + inactive reminders)

Run in SQL Editor (after `email-notifications-schema.sql`):

- `supabase/email-notifications-schema.sql` — email log table
- `supabase/email-automation-schema.sql` — adds `welcome` and `reengagement` types

In **Vercel** (or `.env.local` for local API tests), set:

```env
RESEND_API_KEY=re_your-resend-api-key
EMAIL_FROM=Zumelia <notifications@yourdomain.com>
CRON_SECRET=your-long-random-string
```

| Email | When it sends |
|-------|----------------|
| **Welcome** | Once, when a new user signs up (email or OAuth) |
| **Re-engagement** | Daily cron if inactive 3, 7, or 14 days |
| **Birthday** | Daily cron on the user's birthday |

Cron routes (protected by `CRON_SECRET`):

- `/api/cron/birthday-emails` — 9:00 UTC daily
- `/api/cron/reengagement-emails` — 10:00 UTC daily

Test welcome manually while signed in: `POST /api/email/welcome`
