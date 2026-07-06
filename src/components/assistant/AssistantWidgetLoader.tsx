"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useIdleMount } from "@/hooks/use-idle-mount";
import { createClient } from "@/lib/supabase/client";

const AssistantWidget = dynamic(
  () => import("@/components/assistant/AssistantWidget").then((m) => m.AssistantWidget),
  { ssr: false },
);

export function AssistantWidgetLoader() {
  const idleReady = useIdleMount(4000);
  const [enabled, setEnabled] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!idleReady) return;
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setReady(true);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("ai_assistant_enabled")
        .eq("id", user.id)
        .maybeSingle();
      setEnabled(data?.ai_assistant_enabled !== false);
      setReady(true);
    });
  }, [idleReady]);

  if (!idleReady || !ready || !enabled) return null;
  return <AssistantWidget />;
}
