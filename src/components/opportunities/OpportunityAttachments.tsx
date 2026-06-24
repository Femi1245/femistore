"use client";

import { Download, FileText, Video } from "lucide-react";
import { formatFileSize } from "@/lib/opportunities";
import type { OpportunityAttachment } from "@/lib/types";

export function OpportunityAttachments({
  attachments,
  compact,
}: {
  attachments: OpportunityAttachment[];
  compact?: boolean;
}) {
  if (!attachments.length) return null;

  const images = attachments.filter((a) => a.type === "image");
  const videos = attachments.filter((a) => a.type === "video");
  const docs = attachments.filter((a) => a.type === "document");

  if (compact) {
    const first = images[0] ?? videos[0];
    if (!first || first.type === "document") return null;
    return (
      <div className="mt-3 overflow-hidden rounded-lg border border-vintage-border">
        {first.type === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={first.url} alt="" className="h-36 w-full object-cover" />
        ) : (
          <video src={first.url} className="h-36 w-full object-cover" muted playsInline />
        )}
        {attachments.length > 1 && (
          <p className="bg-vintage-paper-dark px-2 py-1 text-center text-xs text-vintage-ink-muted">
            +{attachments.length - 1} more file{attachments.length > 2 ? "s" : ""}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <h2 className="font-display text-sm font-bold uppercase tracking-wide text-vintage-ink-muted">
        Photos & files
      </h2>

      {images.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {images.map((a) => (
            <a
              key={a.url}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block overflow-hidden rounded-lg border border-vintage-border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.url} alt={a.name} className="max-h-64 w-full object-cover" />
            </a>
          ))}
        </div>
      )}

      {videos.map((a) => (
        <div key={a.url} className="overflow-hidden rounded-lg border border-vintage-border">
          <video src={a.url} controls className="w-full" preload="metadata" />
          <p className="px-3 py-2 text-xs text-vintage-ink-muted">
            {a.name} · {formatFileSize(a.size_bytes)}
          </p>
        </div>
      ))}

      {docs.length > 0 && (
        <ul className="space-y-2">
          {docs.map((a) => (
            <li key={a.url}>
              <a
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border border-vintage-border px-3 py-2.5 transition hover:bg-vintage-paper-dark"
              >
                <FileText className="h-5 w-5 shrink-0 text-vintage-rust" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-vintage-ink">
                    {a.name}
                  </span>
                  <span className="text-xs text-vintage-ink-muted">
                    Document · {formatFileSize(a.size_bytes)}
                  </span>
                </span>
                <Download className="h-4 w-4 shrink-0 text-vintage-ink-muted" />
              </a>
            </li>
          ))}
        </ul>
      )}

      {videos.length > 0 && images.length === 0 && docs.length === 0 && (
        <p className="flex items-center gap-1 text-xs text-vintage-ink-muted">
          <Video className="h-3.5 w-3.5" />
          {videos.length} video{videos.length > 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
