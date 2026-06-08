import { cn } from "@/lib/cn";

export function Skeleton({
  className,
  circle,
}: {
  className?: string;
  circle?: boolean;
}) {
  return (
    <div
      className={cn("skeleton", circle && "skeleton-circle", className)}
      aria-hidden
    />
  );
}
