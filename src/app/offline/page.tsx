import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="vintage-page flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-2xl font-bold text-vintage-ink">You&apos;re offline</h1>
      <p className="mt-2 max-w-sm text-sm text-vintage-ink-muted">
        Zumelia needs an internet connection for chat, live streams, and your feed.
        While you wait, play offline games — no connection required.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/games" className="vintage-btn px-4 py-2 text-sm">
          Play offline games
        </Link>
        <Link href="/feed" className="vintage-btn-outline px-4 py-2 text-sm">
          Retry
        </Link>
      </div>
    </div>
  );
}
