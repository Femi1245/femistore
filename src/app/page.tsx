import Link from "next/link";
import { Globe, MessageCircle, Shield, Zap } from "lucide-react";
import { HomeNavActions } from "@/components/layout/HomeNavActions";
import { Logo } from "@/components/Logo";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="vintage-page min-h-full">
      <nav className="vintage-nav mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <HomeNavActions isLoggedIn={!!user} />
      </nav>

      <section className="mx-auto max-w-6xl px-6 pb-24 pt-12 text-center md:pt-20">
        <p className="mb-4 inline-flex items-center gap-2 vintage-card-inset px-4 py-1.5 text-sm text-vintage-ink-muted">
          <Globe className="h-4 w-4 text-vintage-rust" />
          Connect with anyone, anywhere
        </p>
        <h1 className="font-display mx-auto max-w-3xl text-4xl font-bold leading-tight tracking-tight text-vintage-ink md:text-6xl">
          The world&apos;s conversation starts on{" "}
          <span className="text-vintage-gradient">Zumelia</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-vintage-ink-muted">
          A global chatting platform where people across countries meet, message in
          real time, and build friendships — like the social web you know, built for
          connection without borders.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href={user ? "/feed" : "/signup"}
            className="vintage-btn flex items-center gap-2 px-8 py-4 text-lg"
          >
            <MessageCircle className="h-5 w-5" />
            {user ? "Go to your feed" : "Start chatting free"}
          </Link>
          <Link href="/login" className="vintage-btn-outline px-8 py-4 text-lg">
            I have an account
          </Link>
        </div>

        <div className="mx-auto mt-20 grid max-w-4xl gap-6 md:grid-cols-3">
          {[
            {
              icon: Globe,
              title: "Global discover",
              desc: "Find people by country, username, or name — chat across continents instantly.",
            },
            {
              icon: Zap,
              title: "Real-time messages",
              desc: "Messages appear live as they're sent. No refresh, no waiting.",
            },
            {
              icon: Shield,
              title: "Your space",
              desc: "Private conversations between you and who you choose to connect with.",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="vintage-card p-6 text-left">
              <div className="mb-4 flex h-12 w-12 items-center justify-center vintage-card-inset">
                <Icon className="h-6 w-6 text-vintage-rust" />
              </div>
              <h3 className="font-display font-semibold text-vintage-ink">{title}</h3>
              <p className="mt-2 text-sm text-vintage-ink-muted">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t-2 border-vintage-border py-8 text-center text-sm text-vintage-ink-muted">
        © {new Date().getFullYear()} Zumelia — chat globally, connect freely.
      </footer>
    </div>
  );
}
