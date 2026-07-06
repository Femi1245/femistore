"use client";

import dynamic from "next/dynamic";
import { useIdleMount } from "@/hooks/use-idle-mount";

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

  if (!ready) return null;

  return (
    <>
      <RegisterServiceWorker />
      <InstallAppPrompt />
    </>
  );
}
