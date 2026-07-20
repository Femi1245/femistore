import { useEffect, useRef } from "react";
import { requestWelcomeEmail } from "@/lib/api";

/** Idempotent welcome email when the user enters the main app (login, signup, OAuth). */
export function WelcomeEmailOnAppOpen({ accessToken }: { accessToken: string }) {
  const requested = useRef(false);

  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    void requestWelcomeEmail(accessToken);
  }, [accessToken]);

  return null;
}
