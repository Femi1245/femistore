import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Gamepad2,
  Gift,
  Globe,
  MessageCircle,
  Phone,
  Radio,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";
import { HomeNavActions } from "@/components/layout/HomeNavActions";
import { Logo } from "@/components/Logo";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const features = [
  {
    icon: MessageCircle,
    title: "Real-time chat",
    desc: "DMs, groups, and channels that update live — with secret chats that self-destruct.",
  },
  {
    icon: Phone,
    title: "Voice & video calls",
    desc: "Crystal-clear 1:1 and group calls, plus voice messages when words aren't enough.",
  },
  {
    icon: Radio,
    title: "Go live",
    desc: "Stream to your followers with live chat and reactions in real time.",
  },
  {
    icon: Gift,
    title: "Send gifts",
    desc: "Show love with virtual gifts on profiles, in chat, or during live streams.",
  },
  {
    icon: Gamepad2,
    title: "Play together",
    desc: "Built-in games that even work offline. Challenge friends anytime.",
  },
  {
    icon: Globe,
    title: "Global discover",
    desc: "Find people by country, username, or phone — connect across continents.",
  },
];

const stats = [
  { value: "190+", label: "Countries" },
  { value: "Real-time", label: "Everything live" },
  { value: "End-to-end", label: "Your space, private" },
];

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; error?: string }>;
}) {
  const params = await searchParams;

  // OAuth providers (or a misconfigured Site URL) can deliver the auth code to
  // the root instead of /auth/callback. Forward it so the session is created.
  if (params.code) {
    redirect(`/auth/callback?code=${encodeURIComponent(params.code)}`);
  }
  if (params.error) {
    redirect(`/login?error=${encodeURIComponent(params.error)}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="vintage-page min-h-full">
      <nav className="vintage-nav sticky top-0 z-50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo />
          <HomeNavActions isLoggedIn={!!user} />
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-16 md:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="text-center lg:text-left">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-vintage-border bg-vintage-paper px-4 py-1.5 text-sm text-vintage-ink-muted shadow-sm">
              <Sparkles className="h-4 w-4 text-vintage-rust" />
              Chat, call, live & play — all in one
            </p>
            <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-vintage-ink md:text-6xl">
              The world&apos;s conversation starts on{" "}
              <span className="text-vintage-gradient">Zumelia</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-vintage-ink-muted lg:mx-0">
              Message in real time, hop on a call, go live, send gifts, and play games —
              with people across the world. One app for every way you connect.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
              <Link
                href={user ? "/feed" : "/signup"}
                className="vintage-btn flex w-full items-center justify-center gap-2 px-7 py-3.5 text-base sm:w-auto"
              >
                {user ? "Go to your feed" : "Start free"}
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href={user ? "/chat" : "/login"}
                className="vintage-btn-outline flex w-full items-center justify-center gap-2 px-7 py-3.5 text-base sm:w-auto"
              >
                <MessageCircle className="h-5 w-5" />
                {user ? "Open messages" : "I have an account"}
              </Link>
            </div>

            <div className="mt-10 grid max-w-md grid-cols-3 gap-4 lg:mx-0">
              {stats.map((s) => (
                <div key={s.label} className="text-center lg:text-left">
                  <p className="font-display text-xl font-bold text-vintage-ink">{s.value}</p>
                  <p className="text-xs text-vintage-ink-muted">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Chat preview mockup */}
          <div className="relative mx-auto w-full max-w-sm">
            <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-vintage-rust/20 to-vintage-mustard/10 blur-2xl" />
            <div className="vintage-card overflow-hidden p-0">
              <div className="flex items-center gap-3 border-b border-vintage-border px-4 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-vintage-rust to-vintage-rust-dark text-sm font-bold text-white">
                  A
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-vintage-ink">Amara</p>
                  <p className="text-xs text-vintage-olive">online</p>
                </div>
                <Phone className="h-4 w-4 text-vintage-ink-muted" />
                <Radio className="h-4 w-4 text-vintage-rust" />
              </div>
              <div className="space-y-3 px-4 py-5">
                <div className="flex justify-start">
                  <div className="max-w-[75%] rounded-2xl rounded-bl-sm bg-vintage-card-inset px-3.5 py-2 text-sm text-vintage-ink">
                    Hey! Are you going live tonight? 👀
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="max-w-[75%] rounded-2xl rounded-br-sm bg-gradient-to-br from-vintage-rust to-vintage-rust-dark px-3.5 py-2 text-sm text-white">
                    Yes! 9pm. Bringing the games too 🎮
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="max-w-[75%] rounded-2xl rounded-bl-sm bg-vintage-card-inset px-3.5 py-2 text-sm text-vintage-ink">
                    Sending you a gift 🎁
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2 pt-1 text-xs text-vintage-ink-muted">
                  <Gift className="h-4 w-4 text-vintage-rust" />
                  Amara sent you a Diamond 💎
                </div>
              </div>
              <div className="flex items-center gap-2 border-t border-vintage-border px-4 py-3">
                <div className="flex-1 rounded-full bg-vintage-card-inset px-4 py-2 text-sm text-vintage-ink-muted">
                  Message Amara…
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-vintage-rust to-vintage-rust-dark text-white">
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-vintage-ink md:text-4xl">
            Everything you need to stay connected
          </h2>
          <p className="mt-3 text-vintage-ink-muted">
            Not just another chat app — a full social home for your people.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="vintage-card group p-6 transition-transform duration-200 hover:-translate-y-1"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-vintage-rust/10 text-vintage-rust transition-colors group-hover:bg-vintage-rust group-hover:text-white">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="font-display text-lg font-bold text-vintage-ink">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-vintage-ink-muted">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust band */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: Zap, title: "Built for speed", desc: "Messages, calls, and live streams that feel instant — no refresh, no waiting." },
            { icon: Shield, title: "Private by design", desc: "Mutual-friend messaging and secret chats keep your conversations yours." },
            { icon: Globe, title: "Made for everyone", desc: "Connect across borders, languages, and time zones — the world in one app." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-vintage-rust/10 text-vintage-rust">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-vintage-ink">{title}</h3>
                <p className="mt-1 text-sm text-vintage-ink-muted">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="vintage-card relative overflow-hidden p-10 text-center md:p-16">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-vintage-rust/15 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-vintage-mustard/15 blur-3xl" />
          <h2 className="font-display relative text-3xl font-bold tracking-tight text-vintage-ink md:text-4xl">
            Your people are waiting
          </h2>
          <p className="relative mx-auto mt-3 max-w-lg text-vintage-ink-muted">
            Join Zumelia and start chatting, calling, and going live in minutes. It&apos;s free.
          </p>
          <div className="relative mt-8 flex justify-center">
            <Link
              href={user ? "/feed" : "/signup"}
              className="vintage-btn flex items-center gap-2 px-8 py-4 text-base"
            >
              {user ? "Go to your feed" : "Create your account"}
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-vintage-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-vintage-ink-muted sm:flex-row">
          <Logo size="sm" />
          <p>© {new Date().getFullYear()} Zumelia — chat globally, connect freely.</p>
        </div>
      </footer>
    </div>
  );
}
