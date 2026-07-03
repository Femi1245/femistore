import { redirect } from "next/navigation";
import { ensureProfile } from "@/lib/auth";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/** Admin pages: login with return URL, then owner-only check. */
export async function requireAdminPageUser(returnPath: string): Promise<Profile> {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    redirect(
      `/login?next=${encodeURIComponent(returnPath)}&error=${encodeURIComponent(
        "App configuration error. Check .env.local Supabase settings.",
      )}`,
    );
  }

  let authUser = null;
  try {
    const result = await supabase.auth.getUser();
    authUser = result.data.user;
  } catch {
    redirect(
      `/login?next=${encodeURIComponent(returnPath)}&error=${encodeURIComponent(
        "Could not reach Supabase. Check your internet and .env.local.",
      )}`,
    );
  }

  if (!authUser) {
    redirect(`/login?next=${encodeURIComponent(returnPath)}`);
  }

  const { profile, error } = await ensureProfile(supabase, authUser);
  if (!profile) {
    redirect(
      `/login?next=${encodeURIComponent(returnPath)}&error=${encodeURIComponent(
        error ?? "Profile error",
      )}`,
    );
  }

  const admin = await isPlatformAdmin(supabase, profile.id, authUser.email);
  if (!admin) {
    redirect(
      `/profile/settings?admin_denied=1&as=${encodeURIComponent(profile.username)}`,
    );
  }

  return profile;
}
