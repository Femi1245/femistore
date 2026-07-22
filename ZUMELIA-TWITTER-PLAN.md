# Zumelia — Twitter/X Daily Content Plan

A day-by-day "build in public" posting plan for launching the Zumelia brand as a vibe coder.

---

## Mockups + captions (use every week)

**Mockup page (screenshot these for posts):**
- Local: `http://localhost:3000/marketing/mockups`
- Live: `https://itunes-mu.vercel.app/marketing/mockups`

**Caption source of truth:** `src/lib/marketing-mockups.ts` (same text as the mockup page — copy button on each card).

**Demo personas (fictional — do not share real logins):**
- **Amara Studio** — seller (`@amarastudio_demo`)
- **James O.** — buyer (`@james_buyer_demo`)

### How to mix mockups with normal posts

| Pattern | When | What to post |
|--------|------|----------------|
| **Text only** | Mon, Wed, Sun | Story, hot take, question, build-in-public update from calendar below |
| **Mockup + caption** | Tue, Thu, Sat | Screenshot one phone frame from `/marketing/mockups` + copy caption |
| **Thread / launch** | Milestones | Reveal thread + hero mockup or real screenshot |

**Rule of thumb:** ~**50% mockup posts**, ~**50% text/build-in-public** after launch (Week 4+).

### Mockup slide → post mapping

| Slide ID | Feature | Suggested post day |
|----------|---------|-------------------|
| `seller-inbox` | Seller tab / gig inquiries | Ongoing Mon, Day 23 |
| `storefront` | Business storefront | Ongoing Tue, Day 25 |
| `service-gig` | Service gig → separate thread | Ongoing Wed, Day 24 |
| `calls` | Voice & video calls | Ongoing Thu |
| `auto-reply` | Seller auto-reply settings | Ongoing Fri |
| `live` | Go live + screen share + gifts | Ongoing Sat |
| `live-reactions` | Floating live emoji reactions | Ongoing Sat, Ongoing Wed |
| `notifications` | Messages, likes, comments, calls & more | Ongoing Thu, Ongoing Sun |
| `post-analytics` | Owner post insights | Ongoing Tue, Ongoing Sun |
| `section-tips` | In-app navigation tips | Ongoing Wed, Ongoing Fri |

When you ship a **new feature**, add a row here + a new slide in `marketing-mockups.ts` (agent rule in `.cursor/rules/marketing-mockups.mdc`).

---

## Ongoing content (Week 5+ — repeat weekly)

Rotate mockups and text. Check off each week.

| Day | Type | Content |
|-----|------|---------|
| **Mon** | 🖼️ Mockup | `seller-inbox` — Seller vs personal inbox |
| **Tue** | Text / 📱 | Build-in-public *or* mockup `post-analytics` / `status-engagement` |
| **Wed** | 🖼️ Mockup | `service-gig`, `storefront`, or `section-tips` |
| **Thu** | Text / 📱 | Ask a question / poll *or* mockup `privacy-controls` / `notifications` |
| **Fri** | 🖼️ Mockup | `auto-reply`, `calls`, or `section-tips` |
| **Sat** | 🖼️ Mockup | `live` or `live-reactions` |
| **Sun** | Text / 📱 | Thank followers *or* mockup `post-analytics` / `notifications` |

**Live category launch:** use mockup `live` to show the Video, Gaming, Music,
Talk, Events and Shopping category picker — including real screen share for
Gaming. Copy its current caption from `MARKETING_MOCKUP_SLIDES`.

**Live reactions:** use mockup `live-reactions` for floating emoji reactions on
streams (❤️ 🔥 😂 👏) in realtime.

**Notifications:** use mockup `notifications` for the bell + alerts (messages,
likes, comments, calls, live).

**The arc (Days 1–30):**
- **Week 1 (Days 1–7):** Mystery. Logo-only teasers. Establish "vibe coder building Zumelia."
- **Week 2 (Days 8–14):** Build in public. Show the *process* (not the product).
- **Week 3 (Days 15–21):** Tiny glimpses. Hint at the category, drop feature names.
- **Week 4 (Days 22–30):** The reveal. Show what Zumelia is + waitlist + launch.

**How to use this doc:**
- Post once per day at a consistent time (e.g. 9am or 7pm your time).
- Use 1–2 hashtags max per post.
- Reply to 3–5 other builders' tweets each day so your handle gets discovered.
- 🖼️ = attach an image. Use **logo** (Week 1–3) or **mockup page** (Week 4+).
- 📱 = screenshot from `/marketing/mockups` + caption from `marketing-mockups.ts`.
- Check off each day as you post it.

---

## Week 1 — Mystery (logo only)

### ✅ Day 1 — POSTED
🖼️ Logo
> Day in, day out. Just me, AI, and Zumelia. The logo is the only spoiler you're getting today 🤫

---

### ⬜ Day 2
🖼️ Logo
> New here. I'm a vibe coder — I build real products by leaning hard into AI tools.
>
> Right now everything I have is going into one thing: Zumelia.
>
> Not ready to show what it is. But this is its face. 🟠 Follow along.

`#buildinpublic`

---

### ⬜ Day 3
🖼️ Logo
> People keep asking "what are you building?"
>
> Soon. For now, here's the logo 🟠

`#vibecoding`

---

### ⬜ Day 4
No image (text only)
> I didn't go to school for this.
>
> I describe what I want, build it with AI, ship it, repeat.
>
> Zumelia is proof you can build something real this way.

---

### ⬜ Day 5
🖼️ Logo
> Shipped more this week than I did in some entire months at my old pace.
>
> AI changes what one person can build. Zumelia is the proof I'm working on 👀

---

### ⬜ Day 6
No image (text only)
> Real talk: building solo is lonely some days.
>
> But every time Zumelia gets a little better, it's worth it.
>
> What are you building right now? 👇

`#buildinpublic`

---

### ⬜ Day 7
🖼️ Logo
> One week in public. Still not telling you what Zumelia is 😏
>
> But the people who follow now will be the first to know. 🟠

---

## Week 2 — Build in public (show the process)

### ⬜ Day 8
No image (text only)
> My actual workflow as a vibe coder:
>
> 1. Describe the feature
> 2. Let AI draft it
> 3. Review + refine
> 4. Ship
> 5. Repeat
>
> This is how Zumelia gets built every single day.

---

### ⬜ Day 9
🖼️ Screenshot of your editor/terminal (no product UI)
> Today's session. Coffee, AI, and a long to-do list.
>
> Zumelia got a little closer to ready 🟠

`#buildinpublic`

---

### ⬜ Day 10
No image (text only)
> Hot take: you don't need to be a "real" engineer to ship real software anymore.
>
> You need taste, persistence, and the right AI tools.
>
> Building Zumelia has convinced me of this.

---

### ⬜ Day 11
🖼️ Logo
> Spent today killing bugs instead of adding features.
>
> Not glamorous. But this is what makes Zumelia feel solid when you finally try it. 🟠

---

### ⬜ Day 12
No image (text only)
> The hardest part of building solo isn't the code.
>
> It's deciding what NOT to build.
>
> Cut three ideas from Zumelia today. It's better for it.

---

### ⬜ Day 13
🖼️ Short screen recording of something abstract (loading animation, dark UI motion — no reveal)
> A little motion from inside Zumelia 👀
>
> Can't show you what it does yet. But doesn't it feel good?

`#vibecoding`

---

### ⬜ Day 14
No image (text only)
> Two weeks of building Zumelia in public.
>
> If you've been following — thank you. The reveal is getting closer.
>
> RT this and I'll DM you something when it's live. 🟠

---

## Week 3 — Tiny glimpses (hint the category)

### ⬜ Day 15
No image (text only)
> Here's a hint about what Zumelia is:
>
> It's about people. Connection. Across borders.
>
> That's all you get today 😏

---

### ⬜ Day 16
🖼️ Cropped/blurred screenshot (a corner of the dark neon UI)
> A tiny corner of Zumelia. 🟠
>
> Dark. Neon. Built to feel alive.

`#buildinpublic`

---

### ⬜ Day 17
No image (text only)
> Zumelia has chat. And calls. And live. And more.
>
> But I'm not building "another app." I'm building the place I wish existed.

---

### ⬜ Day 18
🖼️ Close-up of one UI element (a glowing button / message bubble)
> Spent way too long making this one detail glow just right.
>
> The little things are what make Zumelia feel premium. 🟠

---

### ⬜ Day 19
No image (text only)
> What would make you switch to a new social app in 2026?
>
> Genuinely asking — I'm building one (Zumelia) and your answer might shape it. 👇

---

### ⬜ Day 20
🖼️ Logo
> Almost there.
>
> Zumelia is nearly ready to meet the world. 🟠
>
> Want early access? Reply "me" 👇

---

### ⬜ Day 21
🖼️ A wider (still partial) UI glimpse
> 3 weeks ago this was just a logo.
>
> Now Zumelia is a real, working product. Here's a peek 👀

`#buildinpublic`

---

## Week 4 — The reveal + launch

### ⬜ Day 22 — THE REVEAL 🧵 (thread)
🖼️ Hero screenshot of the app
> 1/ It's time. This is Zumelia 🟠
>
> A global social app to chat, call, go live, send gifts, and play — all in one place. Built almost entirely with AI, by one person. Here's the story 🧵

> 2/ I started with nothing but an idea and a logo. I wanted a place that feels alive — dark, neon, fast, fun.

> 3/ Vibe coding made it possible. I described features, AI helped me build them, and I shipped relentlessly.

> 4/ Chat. Voice & video calls. Live streaming. Gifts. Games. Stories. All in Zumelia.

> 5/ This is just the beginning. Want in? [link / waitlist]

---

### ⬜ Day 23
📱 Mockup `seller-inbox` OR `calls` (alternate weeks)
> Use caption from `/marketing/mockups` — copy button on the card.
>
> Zumelia, feature highlight: real-time chat + seller inbox for gig inquiries. 🟠

---

### ⬜ Day 24
📱 Mockup `live` OR `service-gig`
> Use caption from mockup page.

---

### ⬜ Day 25
📱 Mockup `storefront`
> Use caption from mockup page. Built-in games post can be text-only that week.

---

### ⬜ Day 26
No image (text only)
> Building Zumelia taught me: speed is a feature.
>
> One person + AI shipped a full social platform. What's stopping you from building yours?

---

### ⬜ Day 27
🖼️ Short demo video (15–30s walkthrough)
> A quick tour of Zumelia 👀
>
> This is what 4 weeks of vibe coding looks like. 🟠

`#buildinpublic`

---

### ⬜ Day 28
No image (text only)
> To everyone who followed when Zumelia was just a logo — you saw it first. 🙏
>
> The next chapter is growth. Stick around.

---

### ⬜ Day 29
🖼️ Logo + tagline
> Zumelia. Connect globally. 🟠
>
> [link]

---

### ⬜ Day 30
No image (text only)
> 30 days ago: a logo and an idea.
> Today: a live product people are using.
>
> If you're thinking about building something — start. AI + consistency is a superpower.
>
> Next stop for Zumelia: 🚀

---

## Reusable hooks (swap in any day you're stuck)

- "Vibe coding update: today I ___."
- "Building Zumelia solo. Day X. Here's what I learned: ___."
- "Unpopular opinion about building with AI: ___."
- "Behind the scenes of Zumelia 👇"
- "Reply with what you'd want in a social app and I might build it."
- "New on Zumelia: ___" + 📱 mockup from `/marketing/mockups`

## When you ask the AI "what should I post?"

It will mix **this calendar** + **mockup slides** from `src/lib/marketing-mockups.ts`. Prefer the next unchecked day; if you shipped a feature recently, use that feature's mockup slide.

## Hashtags (rotate, max 1–2 per post)
`#buildinpublic` · `#vibecoding` · `#indiehacker` · `#AItools` · `#solopreneur` · `#startup`

## Tips to grow faster
- **Consistency beats perfection** — post every day, even short ones.
- **Engage 15 min/day** — reply to bigger builder accounts before/after you post.
- **Use a hook in line 1** — the first sentence decides if people stop scrolling.
- **Show your face occasionally** — people follow people, not logos.
- **Save your best image posts** for milestones (reveal, launch).
