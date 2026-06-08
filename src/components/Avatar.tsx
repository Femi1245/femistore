import Image from "next/image";
import { getInitials } from "@/lib/chat";

export function Avatar({
  name,
  avatarUrl,
  size = "md",
}: {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-14 w-14 text-lg",
    xl: "h-24 w-24 text-2xl",
  };

  const px = { sm: 32, md: 40, lg: 56, xl: 96 }[size];

  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={name}
        width={px}
        height={px}
        className={`shrink-0 rounded-full object-cover ${sizeClasses[size]}`}
        unoptimized
      />
    );
  }

  const hue = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${sizeClasses[size]}`}
      style={{
        background: `linear-gradient(135deg, hsl(${hue}, 70%, 55%), hsl(${(hue + 40) % 360}, 70%, 45%))`,
      }}
    >
      {getInitials(name)}
    </div>
  );
}
