import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Logo } from "@/components/Logo";
import { SupportForm } from "@/components/support/SupportForm";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { ensureProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Support — Zumelia",
  description: "Contact the Zumelia team for help with your account, bugs, or feedback.",
};

export default async function SupportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { profile: loaded } = await ensureProfile(supabase, user);
    profile = loaded;
  }

  const content = (
    <SupportForm profile={profile} accountEmail={user?.email ?? null} />
  );

  if (profile) {
    return (
      <AppShell user={profile} wide>
        {content}
      </AppShell>
    );
  }

  return (
    <div className="vintage-page min-h-screen">
      <nav className="vintage-nav sticky top-0 z-50">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Logo showWordmark href="/" />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="text-sm font-semibold text-vintage-ink-muted hover:text-vintage-ink"
            >
              Sign in
            </Link>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-xl px-6 py-10">{content}</main>
    </div>
  );
}
