import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { AuthForm } from "@/components/auth/AuthForm";
import { Logo } from "@/components/Logo";

function AuthPageFallback() {
  return (
    <div className="vintage-page flex min-h-dvh items-center justify-center px-4">
      <div className="flex flex-col items-center gap-3">
        <Logo size="lg" />
        <Loader2 className="h-7 w-7 animate-spin text-vintage-rust" aria-hidden />
        <p className="text-sm text-vintage-ink-muted">Opening Zumelia…</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthPageFallback />}>
      <AuthForm mode="login" />
    </Suspense>
  );
}
