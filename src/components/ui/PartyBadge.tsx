import type { HTMLAttributes } from "react";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type PartyCode = "D" | "R" | "I" | "G" | "L" | string;

interface PartyConfig {
  label: string;
  bgClass: string;
  textClass: string;
  ringClass: string;
  dotColor: string;
}

// ─────────────────────────────────────────────
// Party configuration
// ─────────────────────────────────────────────

const PARTY_CONFIG: Record<string, PartyConfig> = {
  D: {
    label:     "Democrat",
    bgClass:   "bg-blue-100",
    textClass: "text-blue-800",
    ringClass: "ring-blue-200",
    dotColor:  "bg-blue-600",
  },
  R: {
    label:     "Republican",
    bgClass:   "bg-red-100",
    textClass: "text-red-800",
    ringClass: "ring-red-200",
    dotColor:  "bg-red-600",
  },
  I: {
    label:     "Independent",
    bgClass:   "bg-purple-100",
    textClass: "text-purple-800",
    ringClass: "ring-purple-200",
    dotColor:  "bg-purple-600",
  },
  G: {
    label:     "Green",
    bgClass:   "bg-green-100",
    textClass: "text-green-800",
    ringClass: "ring-green-200",
    dotColor:  "bg-green-600",
  },
  L: {
    label:     "Libertarian",
    bgClass:   "bg-amber-100",
    textClass: "text-amber-800",
    ringClass: "ring-amber-200",
    dotColor:  "bg-amber-500",
  },
};

const FALLBACK_CONFIG: PartyConfig = {
  label:     "Other",
  bgClass:   "bg-gray-100",
  textClass: "text-gray-700",
  ringClass: "ring-gray-200",
  dotColor:  "bg-gray-500",
};

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────

export interface PartyBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** One-letter party code (D, R, I, G, L) or full party string */
  party: PartyCode | null | undefined;
  /** Show full party name instead of abbreviation */
  showFullName?: boolean;
  /** Visual size variant */
  size?: "xs" | "sm" | "md";
  /** Show the colored dot indicator */
  showDot?: boolean;
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export default function PartyBadge({
  party,
  showFullName = false,
  size = "sm",
  showDot = true,
  className = "",
  ...rest
}: PartyBadgeProps) {
  if (!party) {
    return null;
  }

  // Normalize: extract first char for known codes, or use as-is
  const code = party.trim().toUpperCase();
  const key = Object.keys(PARTY_CONFIG).find(
    (k) => code === k || code.startsWith(k)
  );
  const config = key ? PARTY_CONFIG[key] : FALLBACK_CONFIG;

  const sizeClasses = {
    xs: "text-[10px] px-1.5 py-0.5 gap-1",
    sm: "text-xs px-2 py-0.5 gap-1.5",
    md: "text-sm px-2.5 py-1 gap-1.5",
  }[size];

  const dotSize = {
    xs: "w-1.5 h-1.5",
    sm: "w-2 h-2",
    md: "w-2.5 h-2.5",
  }[size];

  const displayText = showFullName
    ? config.label
    : (key ?? code.charAt(0));

  return (
    <span
      role="img"
      aria-label={`Party: ${config.label}`}
      className={[
        "inline-flex items-center font-semibold rounded-full ring-1",
        config.bgClass,
        config.textClass,
        config.ringClass,
        sizeClasses,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {showDot && (
        <span
          className={`rounded-full flex-shrink-0 ${config.dotColor} ${dotSize}`}
          aria-hidden="true"
        />
      )}
      {displayText}
    </span>
  );
}
