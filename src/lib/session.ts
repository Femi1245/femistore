import { redirect } from "next/navigation";
import { ensureProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export async function requireUser(): Promise<Profile> {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    redirect(
      `/login?error=${encodeURIComponent(
        "App configuration error. Contact support if this persists.",
      )}`,
    );
  }

  let user = null;
  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
    if (result.error && !user) {
      redirect(
        `/login?error=${encodeURIComponent(result.error.message)}`,
      );
    }
  } catch {
    redirect(
      `/login?error=${encodeURIComponent(
        "Couldn't reach the server. Check your connection and try again.",
      )}`,
    );
  }

  if (!user) redirect("/login");

  const { profile, error } = await ensureProfile(supabase, user);
  if (!profile) {
    redirect(`/login?error=${encodeURIComponent(error ?? "Profile error")}`);
  }

  return profile;
}
