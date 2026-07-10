import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { BackButton } from "@/components/layout/BackButton";

export const metadata = {
  title: "Gift — Zumelia",
};

export default async function GiftCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const success = status === "success";

  return (
    <div className="vintage-page flex min-h-screen items-center justify-center px-4">
      <div className="vintage-card w-full max-w-md p-8 text-center">
        <div
          className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl ${
            success ? "bg-vintage-olive/15 text-vintage-olive" : "bg-vintage-rust/15 text-vintage-rust"
          }`}
        >
          {success ? (
            <CheckCircle2 className="h-8 w-8" />
          ) : (
            <XCircle className="h-8 w-8" />
          )}
        </div>

        <h1 className="font-display text-2xl font-bold text-vintage-ink">
          {success ? "Gift sent! 🎁" : "Payment not completed"}
        </h1>
        <p className="mt-2 text-sm text-vintage-ink-muted">
          {success
            ? "Your gift was paid for and delivered. Thank you for supporting the community on Zumelia."
            : "We couldn't confirm your payment. You weren't charged. Please try again."}
        </p>

        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <BackButton
            fallbackHref="/chat"
            label="Open chat"
            className="vintage-btn inline-flex items-center gap-1.5 px-5 py-2.5 text-sm"
          />
          <Link href="/feed" className="vintage-btn-outline px-5 py-2.5 text-sm">
            Go to feed
          </Link>
        </div>
      </div>
    </div>
  );
}
