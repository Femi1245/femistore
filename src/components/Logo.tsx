import NextImage from "next/image";
import Link from "next/link";

const imageSizes = {
  sm: 32,
  md: 40,
  lg: 56,
} as const;

export function Logo({
  size = "md",
  compact = false,
  showWordmark = false,
}: {
  size?: "sm" | "md" | "lg";
  compact?: boolean;
  showWordmark?: boolean;
}) {
  const px = imageSizes[size];

  return (
    <Link
      href="/"
      className="inline-flex shrink-0 items-center gap-2 font-display font-bold"
    >
      <NextImage
        src="/images/zumelia.png"
        alt="Zumelia"
        width={px}
        height={px}
        className="rounded-lg object-contain"
        priority={size === "lg"}
      />
      <span
        className={`font-display font-semibold tracking-wide text-vintage-gradient ${
          size === "sm" ? "text-base" : size === "lg" ? "text-4xl" : "text-2xl"
        } ${showWordmark ? "inline" : compact ? "hidden xl:inline" : ""}`}
      >
        Zumelia
      </span>
    </Link>
  );
}
