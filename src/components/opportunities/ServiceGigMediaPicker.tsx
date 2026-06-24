"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, ImageIcon, Loader2, Paperclip, Video, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  formatFileSize,
  SERVICE_GIG_ACCEPT,
  SERVICE_GIG_FILE_MAX_BYTES,
  SERVICE_GIG_MAX_ATTACHMENTS,
  validateServiceGigFile,
} from "@/lib/opportunities";
import { uploadMedia } from "@/lib/storage";
import type { OpportunityAttachment } from "@/lib/types";

type PendingFile = {
  id: string;
  file: File;
  previewUrl?: string;
};

function mediaIcon(type: OpportunityAttachment["type"]) {
  if (type === "image") return ImageIcon;
  if (type === "video") return Video;
  return FileText;
}

export function ServiceGigMediaPicker({
  userId,
  attachments,
  onChange,
  onUploadingChange,
  disabled,
}: {
  userId: string;
  attachments: OpportunityAttachment[];
  onChange: (next: OpportunityAttachment[]) => void;
  onUploadingChange?: (uploading: boolean) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onUploadingChange?.(uploading);
  }, [uploading, onUploadingChange]);

  const totalCount = attachments.length + pending.length;
  const canAddMore = totalCount < SERVICE_GIG_MAX_ATTACHMENTS;

  async function uploadPending(files: PendingFile[]) {
    if (!files.length) return;
    setUploading(true);
    setError(null);
    const supabase = createClient();
    const uploaded: OpportunityAttachment[] = [];

    for (const item of files) {
      const check = validateServiceGigFile(item.file);
      if (!check.ok) {
        setError(check.error);
        continue;
      }
      const { url, error: uploadError } = await uploadMedia(
        supabase,
        "opportunity-media",
        userId,
        item.file,
        check.type,
      );
      if (uploadError || !url) {
        setError(uploadError ?? `Could not upload ${item.file.name}.`);
        continue;
      }
      uploaded.push({
        type: check.type,
        url,
        name: item.file.name,
        size_bytes: item.file.size,
      });
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    }

    if (uploaded.length) {
      onChange([...attachments, ...uploaded]);
    }
    setPending([]);
    setUploading(false);
  }

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!picked.length) return;

    setError(null);
    const slotsLeft = SERVICE_GIG_MAX_ATTACHMENTS - attachments.length - pending.length;
    if (slotsLeft <= 0) {
      setError(`You can attach up to ${SERVICE_GIG_MAX_ATTACHMENTS} files.`);
      return;
    }

    const toAdd: PendingFile[] = [];
    for (const file of picked.slice(0, slotsLeft)) {
      const check = validateServiceGigFile(file);
      if (!check.ok) {
        setError(check.error);
        continue;
      }
      toAdd.push({
        id: `${file.name}-${file.size}-${Math.random()}`,
        file,
        previewUrl: check.type === "image" ? URL.createObjectURL(file) : undefined,
      });
    }

    if (!toAdd.length) return;

    const nextPending = [...pending, ...toAdd];
    setPending(nextPending);
    void uploadPending(toAdd);
  }

  function removeAttachment(index: number) {
    onChange(attachments.filter((_, i) => i !== index));
  }

  const acceptAll = `${SERVICE_GIG_ACCEPT.image},${SERVICE_GIG_ACCEPT.video},${SERVICE_GIG_ACCEPT.document}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold text-vintage-ink">
          Photos, videos & documents
        </span>
        <span className="text-xs text-vintage-ink-muted">
          {totalCount}/{SERVICE_GIG_MAX_ATTACHMENTS} files
        </span>
      </div>
      <p className="text-xs text-vintage-ink-muted">
        Images up to {formatFileSize(SERVICE_GIG_FILE_MAX_BYTES.image)}, videos up to{" "}
        {formatFileSize(SERVICE_GIG_FILE_MAX_BYTES.video)}, docs up to{" "}
        {formatFileSize(SERVICE_GIG_FILE_MAX_BYTES.document)} (PDF, DOC, DOCX, TXT).
      </p>

      <input
        ref={inputRef}
        type="file"
        accept={acceptAll}
        multiple
        className="hidden"
        disabled={disabled || uploading || !canAddMore}
        onChange={handlePick}
      />

      {(attachments.length > 0 || pending.length > 0) && (
        <ul className="grid gap-2 sm:grid-cols-2">
          {attachments.map((a, i) => {
            const Icon = mediaIcon(a.type);
            return (
              <li
                key={`${a.url}-${i}`}
                className="flex items-center gap-3 rounded-lg border border-vintage-border bg-vintage-paper-dark/40 p-2"
              >
                {a.type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.url}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-md object-cover"
                  />
                ) : (
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-vintage-rust/10 text-vintage-rust">
                    <Icon className="h-5 w-5" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-vintage-ink">{a.name}</p>
                  <p className="text-xs capitalize text-vintage-ink-muted">
                    {a.type} · {formatFileSize(a.size_bytes)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeAttachment(i)}
                  disabled={disabled || uploading}
                  className="shrink-0 rounded-lg p-1.5 text-vintage-ink-muted hover:bg-vintage-rust/10 hover:text-vintage-rust"
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            );
          })}
          {pending.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 rounded-lg border border-dashed border-vintage-border p-2 opacity-70"
            >
              {p.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.previewUrl} alt="" className="h-12 w-12 rounded-md object-cover" />
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded-md bg-vintage-paper-dark">
                  <Loader2 className="h-5 w-5 animate-spin text-vintage-rust" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-vintage-ink">{p.file.name}</p>
                <p className="text-xs text-vintage-ink-muted">Uploading…</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        disabled={disabled || uploading || !canAddMore}
        onClick={() => inputRef.current?.click()}
        className="vintage-btn-outline flex w-full items-center justify-center gap-2 py-2.5 text-sm disabled:opacity-50 sm:w-auto sm:px-5"
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Paperclip className="h-4 w-4" />
        )}
        {uploading ? "Uploading…" : "Add image, video, or document"}
      </button>

      {error && <p className="text-xs text-vintage-rust">{error}</p>}
    </div>
  );
}
