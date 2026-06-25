import { callTypeLabel } from "@/lib/calls";
import type { CallSession, Profile } from "@/lib/types";

let permissionRequested = false;

export async function ensureCallNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission;
  }
  if (!permissionRequested) {
    permissionRequested = true;
    return Notification.requestPermission();
  }
  return Notification.permission;
}

export function notifyIncomingCall(session: CallSession, caller: Profile | null): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (document.visibilityState === "visible" && document.hasFocus()) return;

  const name = caller?.display_name ?? "Someone";
  const label = callTypeLabel(session.call_type).toLowerCase();

  try {
    const notification = new Notification(`Incoming ${label}`, {
      body: `${name} is calling you on Zumelia`,
      tag: `call-${session.id}`,
      requireInteraction: true,
    });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch {
    // Some browsers block notifications without user gesture
  }
}

export async function acknowledgeCallDelivered(sessionId: string): Promise<void> {
  try {
    await fetch("/api/calls/delivered", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
  } catch {
    // Best-effort delivery ack
  }
}
