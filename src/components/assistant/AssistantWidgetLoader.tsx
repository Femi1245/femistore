"use client";

import dynamic from "next/dynamic";

const AssistantWidget = dynamic(
  () => import("@/components/assistant/AssistantWidget").then((m) => m.AssistantWidget),
  { ssr: false },
);

export function AssistantWidgetLoader() {
  return <AssistantWidget />;
}
