import { AlertTriangle, X } from "lucide-react";
import type { HTMLAttributes } from "react";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface RiderAlertBadgeProps extends HTMLAttributes<HTMLDivElement> {
  /** Number of detected riders */
  riderCount?: number;
  /** Short description of the rider(s), shown in tooltip / expanded view */
  description?: string;
  /** Display variant */
  variant?: "badge" | "banner" | "inline";
  /** Whether the alert can be dismissed (only used in banner variant) */
  dismissible?: boolean;
  onDismiss?: () => void;
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export default function RiderAlertBadge({
  riderCount,
  description,
  variant = "badge",
  dismissible = false,
  onDismiss,
  className = "",
  ...rest
}: RiderAlertBadgeProps) {
  const count = riderCount ?? 1;
  const countLabel = count === 1 ? "1 rider" : `${count} riders`;

  const defaultDescription =
    `This bill contains ${countLabel} — provision${count !== 1 ? "s" : ""} ` +
    "unrelated to the bill's primary subject that may have significant policy implications.";

  const displayDescription = description ?? defaultDescription;

  // ── Badge (small inline pill) ──
  if (variant === "badge") {
    return (
      <span
        role="img"
        aria-label={`Warning: ${displayDescription}`}
        title={displayDescription}
        className={[
          "inline-flex items-center gap-1.5 text-xs font-semibold",
          "bg-orange-100 text-orange-800 ring-1 ring-orange-200",
          "rounded-full px-2.5 py-1 whitespace-nowrap",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...rest}
      >
        <AlertTriangle size={12} aria-hidden="true" className="flex-shrink-0" />
        {riderCount !== undefined ? `${countLabel} detected` : "Rider detected"}
      </span>
    );
  }

  // ── Inline (text-level indicator) ──
  if (variant === "inline") {
    return (
      <span
        title={displayDescription}
        className={[
          "inline-flex items-center gap-1 text-xs font-medium text-orange-700",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...rest}
      >
        <AlertTriangle size={12} aria-hidden="true" className="flex-shrink-0" />
        {riderCount !== undefined ? `${countLabel}` : "Rider"}
      </span>
    );
  }

  // ── Banner (full-width alert) ──
  return (
    <div
      role="alert"
      aria-label="Rider alert"
      className={[
        "relative flex items-start gap-3 px-4 py-3.5",
        "bg-orange-50 border-l-4 border-orange-400 rounded-r-lg",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      <AlertTriangle
        size={20}
        aria-hidden="true"
        className="flex-shrink-0 mt-0.5 text-orange-500"
      />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-orange-800 text-sm">
          Rider{count !== 1 ? "s" : ""} Detected
          {riderCount !== undefined && (
            <span className="ml-2 font-normal text-orange-600 text-xs">
              ({countLabel})
            </span>
          )}
        </p>
        <p className="text-orange-700 text-xs leading-relaxed mt-0.5">
          {displayDescription}
        </p>
        <p className="text-orange-600 text-xs mt-1.5 font-medium">
          Read the full bill text to understand all provisions before forming an opinion.
        </p>
      </div>

      {dismissible && onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss rider alert"
          className="flex-shrink-0 p-1 rounded text-orange-500 hover:text-orange-700
                     hover:bg-orange-100 transition-colors focus-visible:outline-none
                     focus-visible:ring-2 focus-visible:ring-orange-400"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
