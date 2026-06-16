"use client";

import { useRouter } from "next/navigation";
import { Briefcase, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { canSwitchAccountMode, getActiveMode, switchAccountMode } from "@/lib/business";
import type { Profile } from "@/lib/types";

export function AccountModeSwitcher({ user }: { user: Profile }) {
  const router = useRouter();

  if (!canSwitchAccountMode(user) && user.account_kind !== "business") {
    return null;
  }

  const mode = getActiveMode(user);
  const isBusiness = mode === "business";

  async function toggle(mode: "personal" | "business") {
    if (user.account_kind === "business") return;
    await switchAccountMode(createClient(), user.id, mode);
    router.refresh();
  }

  if (user.account_kind === "business") {
    return (
      <span className="hidden items-center gap-1 rounded-lg bg-vintage-rust/15 px-2.5 py-1.5 text-xs font-semibold text-vintage-rust sm:inline-flex">
        <Briefcase className="h-3.5 w-3.5" /> Business
      </span>
    );
  }

  return (
    <div className="hidden items-center gap-0.5 rounded-lg vintage-card-inset p-0.5 sm:flex">
      <button
        type="button"
        onClick={() => toggle("personal")}
        className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
          !isBusiness ? "bg-vintage-paper text-vintage-ink shadow-sm" : "text-vintage-ink-muted"
        }`}
      >
        <User className="h-3.5 w-3.5" /> Personal
      </button>
      <button
        type="button"
        onClick={() => toggle("business")}
        className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
          isBusiness ? "bg-vintage-paper text-vintage-rust shadow-sm" : "text-vintage-ink-muted"
        }`}
      >
        <Briefcase className="h-3.5 w-3.5" /> Business
      </button>
    </div>
  );
}
