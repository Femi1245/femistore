"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BUSINESS_CATEGORIES, setupBusinessProfile, updateBusinessProfile } from "@/lib/business";
import { uploadMedia } from "@/lib/storage";
import type { Profile } from "@/lib/types";

export function BusinessSetupForm({
  profile,
  mode = "create",
}: {
  profile: Profile;
  mode?: "create" | "edit";
}) {
  const router = useRouter();
  const coverRef = useRef<HTMLInputElement>(null);

  const [businessName, setBusinessName] = useState(profile.business_name ?? "");
  const [category, setCategory] = useState(profile.business_category ?? "Other");
  const [tagline, setTagline] = useState(profile.business_tagline ?? "");
  const [description, setDescription] = useState(profile.business_description ?? "");
  const [website, setWebsite] = useState(profile.business_website ?? "");
  const [email, setEmail] = useState(profile.business_email ?? "");
  const [phone, setPhone] = useState(profile.business_phone ?? "");
  const [location, setLocation] = useState(profile.business_location ?? "");
  const [services, setServices] = useState(profile.business_services ?? "");
  const [coverUrl, setCoverUrl] = useState(profile.business_cover_url);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onCoverChange(file: File | null) {
    setCoverFile(file);
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverPreview(file ? URL.createObjectURL(file) : null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    let newCoverUrl = coverUrl;

    if (coverFile) {
      const { url, error: uploadError } = await uploadMedia(
        supabase,
        "business-media",
        profile.id,
        coverFile,
        "covers",
      );
      if (uploadError || !url) {
        setError(uploadError ?? "Cover upload failed");
        setLoading(false);
        return;
      }
      newCoverUrl = url;
    }

    const input = {
      business_name: businessName,
      business_category: category,
      business_tagline: tagline,
      business_description: description,
      business_website: website,
      business_email: email,
      business_phone: phone,
      business_location: location,
      business_services: services,
      business_cover_url: newCoverUrl,
    };

    const { error: saveError } =
      mode === "edit"
        ? await updateBusinessProfile(supabase, profile.id, input)
        : await setupBusinessProfile(supabase, profile.id, input, {
            fromSignup: profile.account_kind === "business" && !profile.business_name,
          });

    setLoading(false);
    if (saveError) {
      setError(saveError);
      return;
    }

    router.push(`/profile/${profile.username}`);
    router.refresh();
  }

  const previewCover = coverPreview ?? coverUrl;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-center gap-3 rounded-xl bg-vintage-rust/10 px-4 py-3">
        <Briefcase className="h-5 w-5 text-vintage-rust" />
        <p className="text-sm text-vintage-ink-muted">
          {mode === "create"
            ? "Set up your business profile to showcase what you do and reach customers on Zumelia."
            : "Update your business details and showcase."}
        </p>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-vintage-ink-muted">
          Cover image (optional)
        </label>
        <div
          className="relative mb-2 h-32 overflow-hidden rounded-xl border border-vintage-border bg-vintage-paper-dark"
          style={
            previewCover
              ? { backgroundImage: `url(${previewCover})`, backgroundSize: "cover", backgroundPosition: "center" }
              : undefined
          }
        />
        <input
          ref={coverRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onCoverChange(e.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          onClick={() => coverRef.current?.click()}
          className="vintage-btn-outline px-4 py-2 text-sm"
        >
          Upload cover
        </button>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-vintage-ink-muted">Business name *</label>
        <input
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          required
          placeholder="e.g. Zumelia Studio"
          className="vintage-input w-full px-4 py-2.5"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-vintage-ink-muted">Category *</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="vintage-input w-full px-4 py-2.5"
        >
          {BUSINESS_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-vintage-ink-muted">Tagline</label>
        <input
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          placeholder="Short pitch — what makes you stand out"
          className="vintage-input w-full px-4 py-2.5"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-vintage-ink-muted">About your business</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Tell people what you do, who you serve, and why they should connect with you."
          className="vintage-input w-full resize-none px-4 py-3"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-vintage-ink-muted">Services / products</label>
        <textarea
          value={services}
          onChange={(e) => setServices(e.target.value)}
          rows={3}
          placeholder="List what you offer — coaching, catering, web design, etc."
          className="vintage-input w-full resize-none px-4 py-3"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-vintage-ink-muted">Website</label>
          <input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://"
            className="vintage-input w-full px-4 py-2.5"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-vintage-ink-muted">Business email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="hello@business.com"
            className="vintage-input w-full px-4 py-2.5"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-vintage-ink-muted">Phone</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 555 000 0000"
            className="vintage-input w-full px-4 py-2.5"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-vintage-ink-muted">Location</label>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="City, country"
            className="vintage-input w-full px-4 py-2.5"
          />
        </div>
      </div>

      {error && <p className="text-sm text-vintage-rust">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="vintage-btn flex w-full items-center justify-center gap-2 py-3 disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Briefcase className="h-4 w-4" />}
        {mode === "create" ? "Create business profile" : "Save business profile"}
      </button>
    </form>
  );
}
