"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { acceptsBusinessContact } from "@/lib/business";
import { findOrCreateConversation } from "@/lib/chat";
import type { Profile } from "@/lib/types";

export function BusinessContactButton({
  business,
  currentUserId,
}: {
  business: Profile;
  currentUserId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!acceptsBusinessContact(business) || business.id === currentUserId) {
    return null;
  }

  async function handleContact() {
    setLoading(true);
    setError(null);
    const { convId, error: convError } = await findOrCreateConversation(
      createClient(),
      currentUserId,
      business.id,
    );
    setLoading(false);
    if (convError) {
      setError(convError);
      return;
    }
    if (convId) router.push("/chat");
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void handleContact()}
        disabled={loading}
        className="vintage-btn inline-flex items-center gap-2 px-5 py-2.5 text-sm disabled:opacity-50"
      >
        <MessageCircle className="h-4 w-4" />
        {loading ? "Opening chat…" : "Message business"}
      </button>
      {error && <p className="mt-2 text-xs text-vintage-rust">{error}</p>}
    </div>
  );
}
