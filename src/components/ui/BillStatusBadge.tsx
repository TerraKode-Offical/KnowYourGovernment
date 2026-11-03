import type { HTMLAttributes } from "react";
import {
  FileText,
  GitMerge,
  CheckCircle2,
  XCircle,
  PenLine,
  AlertCircle,
  Clock,
} from "lucide-react";
import { BillStatus } from "@/types";

// ─────────────────────────────────────────────
// Types & Configuration
// ─────────────────────────────────────────────

interface StatusConfig {
  label: string;
  description: string;
  bgClass: string;
  textClass: string;
  ringClass: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
}

const STATUS_CONFIG: Record<BillStatus, StatusConfig> = {
  [BillStatus.INTRODUCED]: {
    label:       "Introduced",
    description: "Bill has been introduced to Congress",
    bgClass:     "bg-slate-100",
    textClass:   "text-slate-700",
    ringClass:   "ring-slate-200",
    Icon:        FileText,
  },
  [BillStatus.IN_COMMITTEE]: {
    label:       "In Committee",
    description: "Bill is being reviewed by a committee",
    bgClass:     "bg-blue-50",
    textClass:   "text-blue-700",
    ringClass:   "ring-blue-200",
    Icon:        Clock,
  },
  [BillStatus.PASSED_HOUSE]: {
    label:       "Passed House",
    description: "Bill has passed the House of Representatives",
    bgClass:     "bg-indigo-100",
    textClass:   "text-indigo-700",
    ringClass:   "ring-indigo-200",
    Icon:        GitMerge,
  },
  [BillStatus.PASSED_SENATE]: {
    label:       "Passed Senate",
    description: "Bill has passed the Senate",
    bgClass:     "bg-violet-100",
    textClass:   "text-violet-700",
    ringClass:   "ring-violet-200",
    Icon:        GitMerge,
  },
  [BillStatus.SIGNED]: {
    label:       "Signed into Law",
    description: "Bill has been signed by the President",
    bgClass:     "bg-green-100",
    textClass:   "text-green-800",
    ringClass:   "ring-green-200",
    Icon:        CheckCircle2,
  },
  [BillStatus.VETOED]: {
    label:       "Vetoed",
    description: "Bill was vetoed by the President",
    bgClass:     "bg-red-100",
    textClass:   "text-red-700",
    ringClass:   "ring-red-200",
    Icon:        XCircle,
  },
  [BillStatus.FAILED]: {
    label:       "Failed",
    description: "Bill did not pass",
    bgClass:     "bg-gray-100",
    textClass:   "text-gray-600",
    ringClass:   "ring-gray-200",
    Icon:        AlertCircle,
  },
};

const FALLBACK_CONFIG: StatusConfig = {
  label:       "Unknown",
  description: "Status unknown",
  bgClass:     "bg-gray-100",
  textClass:   "text-gray-600",
  ringClass:   "ring-gray-200",
  Icon:        PenLine,
};

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────

export interface BillStatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  status: BillStatus | string | null | undefined;
  /** Show icon alongside the label */
  showIcon?: boolean;
  /** Visual size variant */
  size?: "xs" | "sm" | "md";
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export default function BillStatusBadge({
  status,
  showIcon = true,
  size = "sm",
  className = "",
  ...rest
}: BillStatusBadgeProps) {
  if (!status) {
    return null;
  }

  const config =
    STATUS_CONFIG[status as BillStatus] ?? FALLBACK_CONFIG;

  const { Icon } = config;

  const sizeClasses = {
    xs: "text-[10px] px-1.5 py-0.5 gap-1",
    sm: "text-xs px-2.5 py-1 gap-1.5",
    md: "text-sm px-3 py-1.5 gap-2",
  }[size];

  const iconSize = { xs: 10, sm: 12, md: 14 }[size];

  return (
    <span
      role="img"
      aria-label={`Bill status: ${config.label} — ${config.description}`}
      title={config.description}
      className={[
        "inline-flex items-center font-semibold rounded-full ring-1 whitespace-nowrap",
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
      {showIcon && (
        <Icon size={iconSize} aria-hidden="true" className="flex-shrink-0" />
      )}
      {config.label}
    </span>
  );
}
