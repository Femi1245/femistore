import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="vintage-page flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-2xl font-bold text-vintage-ink">You&apos;re offline</h1>
      <p className="mt-2 max-w-sm text-sm text-vintage-ink-muted">
        iTunes needs an internet connection for chat, live streams, and your feed.
        Reconnect and try again.
      </p>
      <Link href="/feed" className="vintage-btn mt-6 px-4 py-2 text-sm">
        Retry
      </Link>
    </div>
  );
}
