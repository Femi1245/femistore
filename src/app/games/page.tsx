import Link from "next/link";
import { GamesHub } from "@/components/games/GamesHub";
import { AppShell } from "@/components/layout/AppShell";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function GamesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (profile) {
      return (
        <AppShell user={profile}>
          <GamesHub />
        </AppShell>
      );
    }
  }

  return (
    <div className="vintage-page min-h-screen px-4 py-8">
      <div className="mx-auto max-w-lg">
        <Link href="/login" className="mb-4 inline-block text-sm text-vintage-rust">
          ← Sign in for full app
        </Link>
        <GamesHub />
      </div>
    </div>
  );
}
