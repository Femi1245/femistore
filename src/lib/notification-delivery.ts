import type { NotificationType, Profile } from "./types";

/** True when local time is inside the user's quiet-hours window (supports overnight spans). */
export function isInQuietHours(
  profile: Pick<Profile, "quiet_hours_start" | "quiet_hours_end">,
  now = new Date(),
): boolean {
  const start = profile.quiet_hours_start?.trim();
  const end = profile.quiet_hours_end?.trim();
  if (!start || !end) return false;

  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return false;

  const mins = now.getHours() * 60 + now.getMinutes();
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;

  if (startMins === endMins) return false;
  if (startMins < endMins) {
    return mins >= startMins && mins < endMins;
  }
  return mins >= startMins || mins < endMins;
}

export function shouldShowBrowserNotification(opts: {
  type: NotificationType;
  prefs: Record<NotificationType, boolean> | null;
  profile: Pick<Profile, "quiet_hours_start" | "quiet_hours_end" | "digest_mode">;
}): boolean {
  if (opts.profile.digest_mode) return false;
  if (isInQuietHours(opts.profile)) return false;
  if (opts.prefs && opts.prefs[opts.type] === false) return false;
  return true;
}
