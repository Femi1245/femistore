export function ReplyQuote({
  label,
  content,
  onClick,
  muted,
}: {
  label: string;
  content: string;
  onClick?: () => void;
  muted?: boolean;
}) {
  const inner = (
    <>
      <p
        className={`font-semibold ${
          muted ? "text-on-rust-muted" : "text-vintage-rust"
        }`}
      >
        {label}
      </p>
      <p className={`line-clamp-2 ${muted ? "text-on-rust" : "text-vintage-ink"}`}>
        {content}
      </p>
    </>
  );

  const className = `mb-2 w-full rounded-lg border-l-2 px-2 py-1.5 text-left text-xs ${
    muted
      ? "border-[var(--vintage-btn-text)]/35 bg-black/10"
      : "border-vintage-rust/60 bg-black/10"
  }`;

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {inner}
      </button>
    );
  }

  return <div className={className}>{inner}</div>;
}
