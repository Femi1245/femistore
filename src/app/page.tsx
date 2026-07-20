import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Briefcase,
  Gamepad2,
  Gift,
  Globe,
  MessageCircle,
  Phone,
  Radio,
  Shield,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";
import { HomeAuthLabel, HomeAuthLink } from "@/components/home/HomeAuthLink";
import { HomeNavActions } from "@/components/layout/HomeNavActions";
import { Logo } from "@/components/Logo";

const pillars = [
  {
    icon: Star,
    title: "Curated circles",
    desc: "Friends, close friends, and following — you choose who gets in. No endless algorithm feed.",
  },
  {
    icon: Briefcase,
    title: "Business with soul",
    desc: "A real storefront, service gigs, and marketplace — without losing your personal identity.",
  },
  {
    icon: Radio,
    title: "Stage-worthy live",
    desc: "Go live with AR lenses, invite co-hosts, and voice lounges — built for presence, not performance anxiety.",
  },
];

const features = [
  {
    icon: MessageCircle,
    title: "Real-time chat",
    desc: "DMs, groups, channels, secret chats, and pay-in-chat — conversations that feel immediate.",
  },
  {
    icon: Phone,
    title: "Voice & video",
    desc: "Crystal-clear calls and voice messages when text isn't enough.",
  },
  {
    icon: Gift,
    title: "Gifts & moments",
    desc: "Send gifts on profiles, in chat, or during live streams — generosity built in.",
  },
  {
    icon: Gamepad2,
    title: "Play together",
    desc: "Built-in games, including offline play with people you care about.",
  },
  {
    icon: Sparkles,
    title: "Opportunities",
    desc: "Jobs, gigs, and collabs posted by the community — apply in one tap.",
  },
  {
    icon: Globe,
    title: "Global discover",
    desc: "Find people and businesses across borders — one premium home for connection.",
  },
];

const stats = [
  { value: "190+", label: "Countries reachable" },
  { value: "Live", label: "Video, voice & AR" },
  { value: "Yours", label: "Privacy-first spaces" },
];

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; error?: string; next?: string }>;
}) {
  const params = await searchParams;

  if (params.code) {
    const callback = new URLSearchParams({ code: params.code });
    if (params.next) callback.set("next", params.next);
    redirect(`/auth/callback?${callback.toString()}`);
  }
  if (params.error) {
    const login = new URLSearchParams({ error: params.error });
    if (params.next) login.set("next", params.next);
    redirect(`/login?${login.toString()}`);
  }

  return (
    <div className="vintage-page min-h-full">
      <nav className="vintage-nav sticky top-0 z-50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo showWordmark />
          <HomeNavActions />
        </div>
      </nav>

      {/* Hero */}
      <section className="relative mx-auto max-w-6xl px-6 pb-20 pt-14 md:pt-20">
        <div className="landing-hero-glow" aria-hidden />
        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="text-center lg:text-left">
            <p className="editorial-eyebrow mb-4">Connection, crafted</p>
            <h1 className="editorial-title max-w-2xl lg:max-w-none">
              Social media that feels{" "}
              <span className="text-vintage-gradient">worth your time</span>
            </h1>
            <p className="editorial-lead mx-auto mt-5 max-w-xl lg:mx-0">
              Zumelia is a premium space for real conversation, live moments, business,
              and community — designed with editorial care, not engagement bait.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
              <HomeAuthLink
                loggedInHref="/feed"
                guestHref="/signup"
                className="vintage-btn flex w-full items-center justify-center gap-2 px-7 py-3.5 text-base sm:w-auto"
              >
                <HomeAuthLabel loggedIn="Open your feed" guest="Create your space" />
                <ArrowRight className="h-5 w-5" />
              </HomeAuthLink>
              <HomeAuthLink
                loggedInHref="/chat"
                guestHref="/login"
                className="vintage-btn-outline flex w-full items-center justify-center gap-2 px-7 py-3.5 text-base sm:w-auto"
              >
                <MessageCircle className="h-5 w-5" />
                <HomeAuthLabel loggedIn="Messages" guest="Sign in" />
              </HomeAuthLink>
            </div>

            <div className="mt-12 grid max-w-lg grid-cols-3 gap-6 lg:mx-0">
              {stats.map((s) => (
                <div key={s.label} className="text-center lg:text-left">
                  <p className="font-display text-xl font-semibold text-vintage-ink md:text-2xl">
                    {s.value}
                  </p>
                  <p className="mt-0.5 text-xs leading-snug text-vintage-ink-muted">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Product preview */}
          <div className="relative mx-auto w-full max-w-md">
            <div className="landing-mockup-frame vintage-card overflow-hidden p-0">
              <div className="flex items-center gap-3 border-b border-vintage-border bg-vintage-paper-dark/50 px-4 py-3">
                <div className="avatar-editorial avatar-editorial-fallback flex h-9 w-9 items-center justify-center rounded-full text-sm">
                  A
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-sm font-semibold text-vintage-ink">Amara</p>
                  <p className="flex items-center gap-1.5 text-xs text-vintage-olive">
                    <span className="status-dot-online inline-block h-1.5 w-1.5 rounded-full" />
                    Online now
                  </p>
                </div>
                <Phone className="h-4 w-4 text-vintage-ink-muted" />
                <Radio className="h-4 w-4 text-vintage-rust" />
              </div>
              <div className="space-y-3 px-4 py-5">
                <div className="flex justify-start">
                  <div className="max-w-[82%] rounded-2xl rounded-bl-md border border-vintage-border bg-vintage-card-inset px-3.5 py-2.5 text-sm leading-relaxed text-vintage-ink">
                    Going live at 9 — AR lenses are wild on here ✨
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="max-w-[82%] rounded-2xl rounded-br-md bg-gradient-to-br from-vintage-rust to-vintage-rust-dark px-3.5 py-2.5 text-sm leading-relaxed text-on-rust">
                    I&apos;ll join. Bringing the lounge link too.
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2 rounded-lg border border-vintage-border/80 bg-vintage-rust/5 py-2 text-xs text-vintage-ink-muted">
                  <Gift className="h-4 w-4 text-vintage-rust" />
                  Amara sent a Diamond gift
                </div>
              </div>
              <div className="flex items-center gap-2 border-t border-vintage-border px-4 py-3">
                <div className="flex-1 rounded-full border border-vintage-border bg-vintage-card-inset px-4 py-2 text-sm text-vintage-ink-muted">
                  Message with intention…
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-vintage-rust to-vintage-rust-dark text-on-rust">
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="border-y border-vintage-border bg-vintage-paper-dark/40 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="editorial-masthead mx-auto mb-12 max-w-2xl text-center">
            <p className="editorial-eyebrow">Why Zumelia</p>
            <h2 className="editorial-title text-3xl md:text-4xl">Beyond the scroll</h2>
            <p className="editorial-lead mx-auto">
              Not another feed optimized for addiction — a considered social home for people
              who want depth, business, and live connection in one place.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {pillars.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="text-center md:text-left">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-vintage-rust/10 text-vintage-rust md:mx-0">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-display text-xl font-semibold text-vintage-ink">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-vintage-ink-muted">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="editorial-masthead mb-12 max-w-2xl">
          <p className="editorial-eyebrow">Everything included</p>
          <h2 className="editorial-title text-3xl md:text-4xl">One app. Every way you connect.</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="vintage-card landing-feature-card pl-5">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-vintage-rust/10 text-vintage-rust">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-semibold text-vintage-ink">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-vintage-ink-muted">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="grid gap-8 md:grid-cols-3">
          {[
            {
              icon: Zap,
              title: "Built for speed",
              desc: "Messages, calls, and live streams that feel instant — no refresh, no waiting.",
            },
            {
              icon: Shield,
              title: "Private by design",
              desc: "Mutual-friend messaging, close circles, and secret chats keep your space yours.",
            },
            {
              icon: Globe,
              title: "Made for everyone",
              desc: "Connect across borders, languages, and time zones — the world in one premium home.",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex gap-4 border-t border-vintage-border pt-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-vintage-border bg-vintage-paper text-vintage-rust">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-vintage-ink">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-vintage-ink-muted">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="vintage-card relative overflow-hidden px-8 py-14 text-center md:px-16 md:py-16">
          <div className="landing-hero-glow opacity-60" aria-hidden />
          <p className="editorial-eyebrow relative">Join Zumelia</p>
          <h2 className="editorial-title relative mx-auto max-w-xl text-3xl md:text-4xl">
            Your people deserve a better place to gather
          </h2>
          <p className="relative mx-auto mt-4 max-w-md text-vintage-ink-muted">
            Free to start. Premium in feel. Open your feed, go live, or open your store in minutes.
          </p>
          <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <HomeAuthLink
              loggedInHref="/feed"
              guestHref="/signup"
              className="vintage-btn relative flex items-center gap-2 px-8 py-3.5 text-base"
            >
              <HomeAuthLabel loggedIn="Go to your feed" guest="Create your account" />
              <ArrowRight className="h-5 w-5" />
            </HomeAuthLink>
            <Link
              href="/discover/businesses"
              className="vintage-btn-outline px-6 py-3.5 text-base"
            >
              Explore businesses
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-vintage-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-vintage-ink-muted sm:flex-row">
          <Logo size="sm" showWordmark />
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/support" className="hover:text-vintage-ink">
              Support
            </Link>
          </div>
          <p className="font-display text-sm" suppressHydrationWarning>
            © {new Date().getFullYear()} Zumelia — connection, crafted.
          </p>
        </div>
      </footer>
    </div>
  );
}
