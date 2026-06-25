"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const CallProvider = dynamic(
  () => import("@/components/chat/CallProvider").then((m) => m.CallProvider),
  { ssr: false },
);

/** Global voice/video call listener — rings on any page when signed in. */
export function CallProviderLoader({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
      setReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!ready) return children;
  if (!userId) return children;
  return <CallProvider userId={userId}>{children}</CallProvider>;
}
