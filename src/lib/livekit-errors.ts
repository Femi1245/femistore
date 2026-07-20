import { ConnectionError, ConnectionErrorReason } from "livekit-client";

function connectionReason(err: unknown): ConnectionErrorReason | undefined {
  if (!err || typeof err !== "object") return undefined;
  const reason = (err as { reason?: unknown }).reason;
  return typeof reason === "number" ? reason : undefined;
}

/** Expected when the user leaves, navigates away, or the room remounts. */
export function isBenignLiveKitError(err: unknown): boolean {
  const reason = connectionReason(err);
  if (
    reason === ConnectionErrorReason.Cancelled ||
    reason === ConnectionErrorReason.LeaveRequest
  ) {
    return true;
  }

  if (err instanceof ConnectionError) {
    return (
      err.reason === ConnectionErrorReason.Cancelled ||
      err.reason === ConnectionErrorReason.LeaveRequest
    );
  }

  const message =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : err !== null && typeof err === "object" && "message" in err
          ? String((err as { message?: unknown }).message ?? "")
          : "";

  const lower = message.toLowerCase();
  const errName =
    err && typeof err === "object"
      ? (err as { name?: string }).name
      : undefined;

  return (
    lower.includes("client initiated disconnect") ||
    lower.includes("user initiated disconnect") ||
    lower.includes("abort connection attempt") ||
    (errName === "ConnectionError" &&
      (lower.includes("disconnect") || lower.includes("cancelled")))
  );
}

export function logLiveKitError(scope: string, err: unknown): void {
  if (isBenignLiveKitError(err)) return;
  console.error(`[${scope}]`, err);
}
