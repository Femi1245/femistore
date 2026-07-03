import Link from "next/link";
import { BadgeCheck, Shield } from "lucide-react";

export function AdminHub() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-vintage-rust">
          <Shield className="h-5 w-5" />
          <span className="text-xs font-bold uppercase tracking-wider">Platform admin</span>
        </div>
        <h1 className="font-display mt-1 text-2xl font-bold text-vintage-ink">Admin dashboard</h1>
        <p className="mt-1 text-sm text-vintage-ink-muted">
          Owner-only tools to review and verify famous accounts on Zumelia.
        </p>
      </div>

      <Link
        href="/admin/verification"
        className="vintage-card group flex flex-col gap-3 p-5 transition hover:ring-1 hover:ring-vintage-rust/30 sm:max-w-md"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-vintage-rust/10 text-vintage-rust transition group-hover:bg-vintage-rust group-hover:text-on-rust">
          <BadgeCheck className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold text-vintage-ink">Verified accounts</h2>
          <p className="mt-1 text-sm text-vintage-ink-muted">
            Review verification requests, grant blue checks to famous people, or revoke badges.
          </p>
        </div>
        <span className="text-xs font-semibold text-vintage-rust">Open →</span>
      </Link>
    </div>
  );
}
