export function UnreadChatBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-vintage-rust px-1 text-[10px] font-bold text-[var(--vintage-btn-text)]">
      {count > 99 ? "99+" : count}
    </span>
  );
}
