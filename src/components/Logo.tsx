import NextImage from "next/image";
import Link from "next/link";

const imageSizes = {
  sm: 32,
  md: 40,
  lg: 56,
} as const;

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const px = imageSizes[size];

  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2 font-display font-bold"
    >
      <NextImage
        src="/images/itunt.png"
        alt="iTunes"
        width={px}
        height={px}
        className="object-contain"
        priority={size === "lg"}
      />
      <span
        className={`text-vintage-gradient ${
          size === "sm" ? "text-lg" : size === "lg" ? "text-4xl" : "text-2xl"
        }`}
      >
        Tunes
      </span>
    </Link>
  );
}
