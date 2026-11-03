import Link from "next/link";
import Image from "next/image";
import { User, MapPin, ExternalLink, Star } from "lucide-react";
import PartyBadge from "./PartyBadge";
import type { CandidateInfo } from "@/types";

// ─────────────────────────────────────────────
// Helper: format office type to readable label
// ─────────────────────────────────────────────

function formatOffice(officeType: string, district?: string | null): string {
  const labels: Record<string, string> = {
    PRESIDENT:         "President of the United States",
    US_SENATOR:        "U.S. Senator",
    US_REPRESENTATIVE: "U.S. Representative",
    GOVERNOR:          "Governor",
    STATE_SENATOR:     "State Senator",
    STATE_REP:         "State Representative",
    OTHER:             "Elected Official",
  };
  const base = labels[officeType] ?? officeType;
  if (district && officeType !== "PRESIDENT" && officeType !== "GOVERNOR") {
    return `${base} — ${district}`;
  }
  return base;
}

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────

export interface CandidateCardProps {
  candidate: CandidateInfo;
  /** Additional CSS classes */
  className?: string;
  /** Show abbreviated info (used in grid layouts) */
  compact?: boolean;
}

// ─────────────────────────────────────────────
// Avatar placeholder
// ─────────────────────────────────────────────

function AvatarPlaceholder({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div
      aria-hidden="true"
      className="w-full h-full flex items-center justify-center
                 bg-gradient-to-br from-[#2D4066] to-[#1B2A4A]"
    >
      <span className="text-white font-serif font-bold text-2xl select-none">
        {initials || <User size={32} className="text-white/60" />}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export default function CandidateCard({
  candidate,
  className = "",
  compact = false,
}: CandidateCardProps) {
  const {
    id,
    name,
    party,
    photoUrl,
    biography,
    websiteUrl,
    officeType,
    district,
    isIncumbent,
    state,
  } = candidate;

  const officeLabel = formatOffice(officeType, district);
  const bioSnippet =
    biography && biography.length > 120
      ? biography.slice(0, 117).trimEnd() + "…"
      : biography;

  return (
    <article
      className={[
        "group relative flex flex-col bg-white rounded-xl overflow-hidden",
        "border border-gray-200 shadow-sm",
        "hover:shadow-md hover:border-[#2B6CB0]/30",
        "transition-all duration-200",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={`Candidate: ${name}`}
    >
      {/* ── Photo area ── */}
      <Link
        href={`/candidate/${id}`}
        className="block relative w-full aspect-square bg-gray-100 overflow-hidden
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2B6CB0]
                   focus-visible:ring-inset"
        tabIndex={0}
        aria-label={`View ${name}'s profile`}
      >
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt={`Photo of ${name}`}
            fill
            className="object-cover object-top transition-transform duration-300
                       group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <AvatarPlaceholder name={name} />
        )}

        {/* Incumbent badge overlay */}
        {isIncumbent && (
          <span
            className="absolute top-2 left-2 inline-flex items-center gap-1 text-[10px]
                       font-semibold bg-[#D69E2E] text-white px-2 py-0.5 rounded-full
                       shadow-sm"
            aria-label="Incumbent"
          >
            <Star size={9} fill="currentColor" aria-hidden="true" />
            Incumbent
          </span>
        )}
      </Link>

      {/* ── Content area ── */}
      <div className="flex flex-col flex-1 p-4 gap-2.5">
        {/* Name + party */}
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/candidate/${id}`}
            className="font-serif font-bold text-[#1B2A4A] text-base leading-tight
                       hover:text-[#2B6CB0] transition-colors focus-visible:outline-none
                       focus-visible:underline"
          >
            {name}
          </Link>
          <PartyBadge party={party} size="xs" className="flex-shrink-0 mt-0.5" />
        </div>

        {/* Office */}
        <p className="text-xs font-medium text-[#2B6CB0] leading-tight">
          {officeLabel}
        </p>

        {/* State */}
        {state && (
          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
            <MapPin size={11} aria-hidden="true" />
            {state.name}
          </span>
        )}

        {/* Bio snippet — hidden in compact mode */}
        {!compact && bioSnippet && (
          <p className="text-xs text-gray-600 leading-relaxed mt-1 flex-1">
            {bioSnippet}
          </p>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-2 mt-auto border-t border-gray-100 gap-2">
          <Link
            href={`/candidate/${id}`}
            className="text-xs font-semibold text-[#2B6CB0] hover:text-[#1B2A4A]
                       transition-colors focus-visible:outline-none focus-visible:underline"
          >
            View Profile &rarr;
          </Link>

          {websiteUrl && (
            <a
              href={websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-gray-500
                         hover:text-[#1B2A4A] transition-colors focus-visible:outline-none
                         focus-visible:underline"
              aria-label={`${name}'s official website (opens in new tab)`}
            >
              <ExternalLink size={11} aria-hidden="true" />
              Website
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
