import { redirect } from "next/navigation";
import { ensureProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export async function requireUser(): Promise<Profile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { profile, error } = await ensureProfile(supabase, user);
  if (!profile) {
    redirect(`/login?error=${encodeURIComponent(error ?? "Profile error")}`);
  }

  return profile;
}
