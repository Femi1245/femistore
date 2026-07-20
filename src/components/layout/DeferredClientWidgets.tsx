"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useIdleMount } from "@/hooks/use-idle-mount";
import { isInstalledAppShell } from "@/lib/native-shell";

const InstallAppPrompt = dynamic(
  () =>
    import("@/components/pwa/InstallAppPrompt").then((m) => m.InstallAppPrompt),
  { ssr: false },
);

const RegisterServiceWorker = dynamic(
  () =>
    import("@/components/pwa/RegisterServiceWorker").then(
      (m) => m.RegisterServiceWorker,
    ),
  { ssr: false },
);

export function DeferredClientWidgets() {
  const ready = useIdleMount();
  const [inApp, setInApp] = useState(false);

  useEffect(() => {
    setInApp(isInstalledAppShell());
  }, []);

  if (!ready) return null;

  // Inside the installed app: never show download/install prompts
  if (inApp) return null;

  return (
    <>
      <RegisterServiceWorker />
      <InstallAppPrompt />
    </>
  );
}
