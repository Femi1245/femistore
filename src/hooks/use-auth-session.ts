"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Lightweight client auth check — avoids blocking static pages on server session. */
export function useAuthSession() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setLoggedIn(!!session);
      setReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session);
      setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { loggedIn, ready };
}
