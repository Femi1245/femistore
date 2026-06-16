import { Briefcase, Globe, Mail, MapPin, Phone } from "lucide-react";
import type { Profile } from "@/lib/types";

export function BusinessProfileShowcase({ profile }: { profile: Profile }) {
  if (!profile.business_name) return null;

  return (
    <section className="vintage-card overflow-hidden">
      {profile.business_cover_url && (
        <div
          className="h-40 bg-cover bg-center sm:h-48"
          style={{ backgroundImage: `url(${profile.business_cover_url})` }}
        />
      )}
      <div className="p-5 sm:p-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-vintage-rust/15 px-3 py-1 text-xs font-semibold text-vintage-rust">
            <Briefcase className="h-3.5 w-3.5" /> Business
          </span>
          {profile.business_category && (
            <span className="rounded-full vintage-card-inset px-3 py-1 text-xs font-medium text-vintage-ink-muted">
              {profile.business_category}
            </span>
          )}
        </div>

        <h2 className="font-display text-xl font-bold text-vintage-ink">{profile.business_name}</h2>
        {profile.business_tagline && (
          <p className="mt-1 text-sm font-medium text-vintage-rust">{profile.business_tagline}</p>
        )}
        {profile.business_description && (
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-vintage-ink">
            {profile.business_description}
          </p>
        )}
        {profile.business_services && (
          <div className="mt-4 rounded-xl vintage-card-inset p-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-vintage-ink-muted">
              What we offer
            </p>
            <p className="whitespace-pre-wrap text-sm text-vintage-ink">{profile.business_services}</p>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          {profile.business_website && (
            <a
              href={
                profile.business_website.startsWith("http")
                  ? profile.business_website
                  : `https://${profile.business_website}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-vintage-rust hover:underline"
            >
              <Globe className="h-4 w-4" /> Website
            </a>
          )}
          {profile.business_email && (
            <a
              href={`mailto:${profile.business_email}`}
              className="flex items-center gap-1.5 text-vintage-ink-muted hover:text-vintage-rust"
            >
              <Mail className="h-4 w-4" /> {profile.business_email}
            </a>
          )}
          {profile.business_phone && (
            <span className="flex items-center gap-1.5 text-vintage-ink-muted">
              <Phone className="h-4 w-4" /> {profile.business_phone}
            </span>
          )}
          {profile.business_location && (
            <span className="flex items-center gap-1.5 text-vintage-ink-muted">
              <MapPin className="h-4 w-4" /> {profile.business_location}
            </span>
          )}
        </div>

        {profile.business_website && (
          <a
            href={
              profile.business_website.startsWith("http")
                ? profile.business_website
                : `https://${profile.business_website}`
            }
            target="_blank"
            rel="noopener noreferrer"
            className="vintage-btn mt-5 inline-flex px-5 py-2.5 text-sm"
          >
            Visit business
          </a>
        )}
      </div>
    </section>
  );
}
