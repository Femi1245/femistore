"use client";

import { useEffect, useRef } from "react";

/** Idempotent welcome email — safe on login, signup, or any authenticated page load. */
export function WelcomeEmailTrigger() {
  const requested = useRef(false);

  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    void fetch("/api/email/welcome", { method: "POST" });
  }, []);

  return null;
}
