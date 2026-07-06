"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useIdleMount } from "@/hooks/use-idle-mount";
import { createClient } from "@/lib/supabase/client";

const CallProvider = dynamic(
  () => import("@/components/chat/CallProvider").then((m) => m.CallProvider),
  { ssr: false },
);

/** Global voice/video call listener — rings on any page when signed in. */
export function CallProviderLoader({ children }: { children: React.ReactNode }) {
  const idleReady = useIdleMount(3000);
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!idleReady) return;
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
  }, [idleReady]);

  if (!idleReady || !ready) return children;
  if (!userId) return children;
  return <CallProvider userId={userId}>{children}</CallProvider>;
}
