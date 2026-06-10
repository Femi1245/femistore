"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { uploadMedia } from "@/lib/storage";
import { COUNTRIES } from "@/lib/countries";
import type { Profile } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { PhoneVerification } from "@/components/settings/PhoneVerification";

export function ProfileEditForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(profile.display_name);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [country, setCountry] = useState(profile.country);
  const [dateOfBirth, setDateOfBirth] = useState(profile.date_of_birth ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function onAvatarChange(file: File | null) {
    setAvatarFile(file);
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(file ? URL.createObjectURL(file) : null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const supabase = createClient();
    let newAvatarUrl = avatarUrl;

    if (avatarFile) {
      const { url, error: uploadError } = await uploadMedia(
        supabase,
        "avatars",
        profile.id,
        avatarFile,
      );
      if (uploadError || !url) {
        setError(uploadError ?? "Avatar upload failed");
        setLoading(false);
        return;
      }
      newAvatarUrl = url;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim(),
        bio: bio.trim(),
        country,
        date_of_birth: dateOfBirth || null,
        avatar_url: newAvatarUrl,
      })
      .eq("id", profile.id);

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    router.refresh();
    router.push(`/profile/${profile.username}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <Avatar
          name={displayName}
          avatarUrl={avatarPreview ?? avatarUrl}
          size="xl"
        />
        <div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="vintage-btn-outline px-4 py-2 text-sm"
          >
            Change photo
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onAvatarChange(e.target.files?.[0] ?? null)}
          />
          <p className="mt-2 text-xs text-vintage-ink-muted">JPG, PNG or GIF</p>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-vintage-ink-muted">
          Display name
        </label>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
          className="vintage-input w-full px-4 py-2.5"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-vintage-ink-muted">
          Username
        </label>
        <input
          value={profile.username}
          disabled
          className="vintage-input w-full px-4 py-2.5 opacity-70"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-vintage-ink-muted">Bio</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
          maxLength={500}
          placeholder="Tell the world about yourself…"
          className="vintage-input w-full px-4 py-2.5"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-vintage-ink-muted">
          Date of birth
        </label>
        <input
          type="date"
          value={dateOfBirth}
          onChange={(e) => setDateOfBirth(e.target.value)}
          className="vintage-input w-full px-4 py-2.5"
        />
      </div>

      <PhoneVerification profile={profile} onVerified={() => router.refresh()} />

      <div>
        <label className="mb-1 block text-xs font-medium text-vintage-ink-muted">
          Country / region
        </label>
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="vintage-input w-full px-4 py-2.5"
        >
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="vintage-card-inset px-3 py-2 text-sm text-vintage-rust">{error}</p>
      )}
      {success && (
        <p className="vintage-card-inset px-3 py-2 text-sm text-vintage-olive">
          Profile saved!
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="vintage-btn w-full py-3 disabled:opacity-50"
      >
        {loading ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
