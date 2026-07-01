import { BadgeCheck } from "lucide-react";
import { verificationCategoryLabel } from "@/lib/verification";
import type { VerificationCategory } from "@/lib/types";

export function VerifiedBadge({
  category,
  size = "sm",
  className = "",
}: {
  category?: VerificationCategory | null;
  size?: "xs" | "sm" | "md";
  className?: string;
}) {
  const iconClass =
    size === "xs" ? "h-3.5 w-3.5" : size === "md" ? "h-5 w-5" : "h-4 w-4";
  const label = verificationCategoryLabel(category);

  return (
    <span
      className={`inline-flex shrink-0 items-center text-sky-600 ${className}`}
      title={`Verified — ${label}`}
      aria-label={`Verified ${label}`}
    >
      <BadgeCheck className={iconClass} aria-hidden />
    </span>
  );
}

export function VerifiedName({
  name,
  verified,
  category,
  className = "",
}: {
  name: string;
  verified?: boolean;
  category?: VerificationCategory | null;
  className?: string;
}) {
  if (!verified) {
    return <span className={className}>{name}</span>;
  }

  return (
    <span className={`inline-flex min-w-0 items-center gap-1 ${className}`}>
      <span className="truncate">{name}</span>
      <VerifiedBadge category={category} size="sm" />
    </span>
  );
}
