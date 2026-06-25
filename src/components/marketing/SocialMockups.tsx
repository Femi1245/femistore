"use client";

import { useState } from "react";
import {
  Briefcase,
  Check,
  Copy,
  MessageCircle,
  Phone,
  Radio,
  Sparkles,
  Store,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import {
  DEMO_PERSONAS,
  MARKETING_MOCKUP_SLIDES,
  fullMockupCaption,
  type MarketingMockupSlideId,
} from "@/lib/marketing-mockups";

const SLIDE_ICONS: Record<MarketingMockupSlideId, typeof Briefcase> = {
  "seller-inbox": Briefcase,
  "service-gig": Store,
  "auto-reply": MessageCircle,
  storefront: Store,
  calls: Phone,
  live: Radio,
};

function PhoneFrame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="mx-auto w-full max-w-[280px]">
      <div className="rounded-[2rem] border-[3px] border-vintage-ink/15 bg-vintage-ink p-2 shadow-2xl">
        <div className="mb-1 flex justify-center">
          <div className="h-1.5 w-16 rounded-full bg-vintage-ink/40" />
        </div>
        <div className="overflow-hidden rounded-[1.4rem] bg-vintage-cream">
          <div className="flex items-center justify-between border-b border-vintage-border/60 bg-vintage-paper px-3 py-2">
            <span className="text-[10px] font-semibold text-vintage-ink-muted">9:41</span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-vintage-rust">
              {label}
            </span>
            <span className="text-[10px] text-vintage-ink-muted">●●●</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

function Avatar({ name, color }: { name: string; color: string }) {
  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
      style={{ backgroundColor: color }}
    >
      {name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)}
    </div>
  );
}

function CopyCaption({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="vintage-btn-outline mt-3 flex w-full items-center justify-center gap-2 py-2 text-xs font-semibold"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied!" : "Copy caption for X"}
    </button>
  );
}

function SellerInboxMock() {
  return (
    <div className="min-h-[380px] bg-vintage-cream p-2">
      <div className="mb-2 flex items-center gap-2 px-1">
        <Logo size="sm" compact />
      </div>
      <div className="mb-2 flex gap-1 rounded-lg vintage-card-inset p-1 text-[9px] font-semibold">
        <span className="rounded-md px-2 py-1 text-vintage-ink-muted">Chats</span>
        <span className="rounded-md bg-vintage-rust px-2 py-1 text-on-rust">Seller</span>
        <span className="rounded-md px-2 py-1 text-vintage-ink-muted">Unread</span>
      </div>
      <div className="rounded-lg bg-vintage-rust/5 px-2 py-2 text-[8px] text-vintage-ink-muted">
        Gig inquiries from your service listings
      </div>
      <div className="mt-2 space-y-1">
        {[
          { name: DEMO_PERSONAS.buyer.name, msg: "Interested in your braiding package", time: "2m" },
          { name: "Priya K.", msg: "Can you do Saturday delivery?", time: "1h" },
        ].map((c) => (
          <div key={c.name} className="flex items-center gap-2 rounded-xl bg-vintage-rust/10 px-2 py-2">
            <Avatar name={c.name} color="#5a6b52" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[10px] font-semibold text-vintage-ink">{c.name}</p>
              <p className="truncate text-[9px] text-vintage-ink-muted">{c.msg}</p>
            </div>
            <span className="text-[8px] text-vintage-ink-muted">{c.time}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-lg border border-dashed border-vintage-border px-2 py-2 text-center text-[8px] text-vintage-ink-muted">
        Personal chats stay in Chats — never mixed
      </div>
    </div>
  );
}

function GigListingMock() {
  return (
    <div className="min-h-[380px] bg-vintage-cream p-3">
      <p className="text-[10px] font-bold text-vintage-ink">
        Braids & Styling — {DEMO_PERSONAS.seller.name}
      </p>
      <p className="mt-1 text-[9px] text-vintage-ink-muted">Lagos · Service gig</p>
      <div className="mt-3 h-24 rounded-lg bg-gradient-to-br from-vintage-rust/30 to-vintage-olive/20" />
      <p className="mt-2 text-[9px] leading-relaxed text-vintage-ink">
        Home-service braiding, knotless & box braids. Book via message — replies in Seller inbox.
      </p>
      <button
        type="button"
        className="vintage-btn mt-3 flex w-full items-center justify-center gap-1 py-2 text-[10px] font-semibold"
      >
        <MessageCircle className="h-3 w-3" /> Message about this gig
      </button>
      <p className="mt-2 text-center text-[8px] text-vintage-olive">Opens a separate gig thread</p>
    </div>
  );
}

function ChatThreadMock() {
  return (
    <div className="flex min-h-[380px] flex-col bg-vintage-cream">
      <div className="border-b border-vintage-border/60 px-3 py-2">
        <p className="text-[10px] font-semibold">{DEMO_PERSONAS.seller.name}</p>
        <p className="text-[8px] text-vintage-ink-muted">
          {DEMO_PERSONAS.seller.handle} · Gig inquiry
        </p>
      </div>
      <div className="flex-1 space-y-2 p-3">
        <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-vintage-rust px-2.5 py-1.5 text-[9px] text-on-rust">
          Hi! I&apos;m interested in your braiding package on Zumelia.
        </div>
        <div className="max-w-[85%] rounded-2xl rounded-bl-sm vintage-card-inset px-2.5 py-1.5 text-[9px] text-vintage-ink">
          Thanks for reaching out! We reply within 24 hours on weekdays. 🟠
        </div>
        <p className="text-center text-[7px] text-vintage-ink-muted">Auto-reply · once per gig chat</p>
      </div>
    </div>
  );
}

function CallsMock() {
  return (
    <div className="flex min-h-[380px] flex-col items-center justify-center bg-vintage-ink p-4 text-center">
      <div className="mb-3 h-16 w-16 rounded-full bg-vintage-rust/30 ring-2 ring-vintage-rust" />
      <p className="text-sm font-semibold text-vintage-cream">{DEMO_PERSONAS.buyer.name}</p>
      <p className="text-[10px] text-vintage-ink-muted">Incoming video call…</p>
      <div className="mt-6 flex gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-500/90">
          <Phone className="h-4 w-4 rotate-[135deg] text-white" />
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-vintage-olive">
          <Phone className="h-4 w-4 text-white" />
        </div>
      </div>
    </div>
  );
}

function LiveMock() {
  return (
    <div className="relative min-h-[380px] bg-vintage-ink">
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
      <div className="relative flex items-center justify-between p-3">
        <span className="rounded bg-red-600 px-1.5 py-0.5 text-[8px] font-bold text-white">LIVE</span>
        <span className="text-[9px] text-white/80">1.2k watching</span>
      </div>
      <div className="absolute bottom-16 left-3 right-3 space-y-1">
        <p className="text-[8px] text-white/90">user12: This AR filter 🔥</p>
        <p className="text-[8px] text-white/90">maya: Just sent a gift!</p>
      </div>
      <div className="absolute bottom-3 left-3 right-3 flex gap-2">
        <div className="flex-1 rounded-full bg-white/15 px-3 py-1.5 text-[8px] text-white/60">
          Say something…
        </div>
        <div className="rounded-full bg-vintage-rust px-3 py-1.5 text-[8px] font-bold text-on-rust">
          Gift
        </div>
      </div>
    </div>
  );
}

function StorefrontMock() {
  return (
    <div className="min-h-[380px] bg-vintage-cream">
      <div className="h-20 bg-gradient-to-br from-vintage-ink to-vintage-rust/60" />
      <div className="-mt-6 px-3">
        <Avatar name={DEMO_PERSONAS.seller.name} color="#c9a962" />
        <p className="mt-2 text-[11px] font-bold">{DEMO_PERSONAS.seller.name}</p>
        <p className="text-[9px] text-vintage-ink-muted">Beauty · Lagos, Nigeria</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {["Box braids", "Silk press"].map((g) => (
            <div key={g} className="rounded-lg vintage-card-inset p-2 text-[8px] font-semibold">
              {g}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const MOCKUP_UI: Record<MarketingMockupSlideId, React.ReactNode> = {
  "seller-inbox": <SellerInboxMock />,
  "service-gig": <GigListingMock />,
  "auto-reply": <ChatThreadMock />,
  storefront: <StorefrontMock />,
  calls: <CallsMock />,
  live: <LiveMock />,
};

export function SocialMockups() {
  return (
    <div className="vintage-page min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center">
          <Logo size="lg" showWordmark />
          <h1 className="mt-4 font-display text-2xl font-bold text-vintage-ink sm:text-3xl">
            X / Twitter mockups
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-vintage-ink-muted">
            Screenshot any phone frame and post with the caption. Demo:{" "}
            <strong>{DEMO_PERSONAS.seller.name}</strong> (seller) &{" "}
            <strong>{DEMO_PERSONAS.buyer.name}</strong> (buyer). Matches{" "}
            <code className="text-xs">ZUMELIA-TWITTER-PLAN.md</code>.
          </p>
        </div>

        <div className="grid gap-10 lg:grid-cols-2">
          {MARKETING_MOCKUP_SLIDES.map((slide) => {
            const Icon = SLIDE_ICONS[slide.id];
            return (
              <article key={slide.id} className="vintage-card overflow-hidden p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Icon className="h-4 w-4 text-vintage-rust" />
                  <h2 className="font-display text-lg font-semibold text-vintage-ink">{slide.title}</h2>
                </div>
                <p className="mb-3 text-[10px] text-vintage-ink-muted">{slide.feature}</p>

                <PhoneFrame label="Zumelia">{MOCKUP_UI[slide.id]}</PhoneFrame>

                <div className="mt-5 rounded-xl vintage-card-inset p-4">
                  <p className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-vintage-ink-muted">
                    <Sparkles className="h-3 w-3" /> Suggested caption
                  </p>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-vintage-ink">
                    {slide.caption}
                  </p>
                  <p className="mt-2 text-xs text-vintage-rust">{slide.hashtags}</p>
                  <CopyCaption text={fullMockupCaption(slide)} />
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
