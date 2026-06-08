"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

export function LiveSetupNotice() {
  const [info, setInfo] = useState<{
    ready: boolean;
    liveKitReady: boolean;
    databaseReady: boolean;
    message?: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/live/status")
      .then((r) => r.json())
      .then(setInfo)
      .catch(() => {});
  }, []);

  if (!info || info.ready) return null;

  return (
    <div className="vintage-card-inset mb-4 space-y-2 border-vintage-mustard/50 px-4 py-3 text-sm text-vintage-ink">
      <div className="flex gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-vintage-mustard" />
        <div>
          <p className="font-semibold">Live video needs setup</p>
          <p className="mt-1 text-vintage-ink-muted">{info.message}</p>
          {!info.liveKitReady && (
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-vintage-ink-muted">
              <li>
                Sign up at{" "}
                <a
                  href="https://cloud.livekit.io"
                  target="_blank"
                  rel="noreferrer"
                  className="text-vintage-rust underline"
                >
                  cloud.livekit.io
                </a>{" "}
                (free tier)
              </li>
              <li>Open your project → Settings → Keys</li>
              <li>
                Add to <code className="text-xs">.env.local</code>:
                <pre className="mt-1 overflow-x-auto rounded-sm bg-vintage-paper-dark p-2 text-xs">
{`NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=APIxxxxx
LIVEKIT_API_SECRET=xxxxx`}
                </pre>
              </li>
              <li>Restart <code className="text-xs">npm run dev</code></li>
            </ol>
          )}
          {info.liveKitReady && !info.databaseReady && (
            <p className="mt-2 text-vintage-ink-muted">
              Run <code className="text-xs">supabase/live-schema.sql</code> in Supabase SQL Editor.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
