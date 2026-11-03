import { CheckCircle, AlertTriangle, AlertCircle } from "lucide-react";

interface DataSourceBadgeProps {
  lastVerifiedAt: Date | string | null;
  sourceName: string;
  sourceUrl?: string | null;
}

function getRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

export default function DataSourceBadge({
  lastVerifiedAt,
  sourceName,
  sourceUrl,
}: DataSourceBadgeProps) {
  const verifiedDate = lastVerifiedAt
    ? new Date(lastVerifiedAt)
    : null;

  const diffDays = verifiedDate
    ? Math.floor((Date.now() - verifiedDate.getTime()) / (1000 * 60 * 60 * 24))
    : Infinity;

  let colorClass: string;
  let Icon: typeof CheckCircle;

  if (diffDays <= 7) {
    colorClass = "text-green-600 bg-green-50";
    Icon = CheckCircle;
  } else if (diffDays <= 30) {
    colorClass = "text-amber-600 bg-amber-50";
    Icon = AlertTriangle;
  } else {
    colorClass = "text-red-600 bg-red-50";
    Icon = AlertCircle;
  }

  const label = verifiedDate
    ? `Verified ${getRelativeTime(verifiedDate)}`
    : "Not yet verified";

  const SourceTag = sourceUrl ? "a" : "span";
  const sourceProps = sourceUrl
    ? { href: sourceUrl, target: "_blank", rel: "noopener noreferrer", className: "underline underline-offset-2 hover:text-current" }
    : {};

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${colorClass}`}
      title={verifiedDate ? `Verified: ${verifiedDate.toLocaleString()}` : "No verification recorded"}
    >
      <Icon size={12} />
      {label} via{" "}
      <SourceTag {...sourceProps}>{sourceName}</SourceTag>
    </span>
  );
}
