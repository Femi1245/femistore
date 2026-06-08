"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

export function SetupNotice() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/db-status")
      .then((r) => r.json())
      .then((data: { ready: boolean; message?: string }) => {
        if (!data.ready && data.message) {
          setMessage(data.message);
        }
      })
      .catch(() => {});
  }, []);

  if (!message) return null;

  return (
    <div className="mb-4 flex gap-2 vintage-card-inset border-vintage-mustard/50 px-4 py-3 text-sm text-vintage-ink">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-vintage-mustard" />
      <p>{message}</p>
    </div>
  );
}
