import { BillStatus } from "@/types";

// ─────────────────────────────────────────────
// Tailwind class merger
// ─────────────────────────────────────────────

/**
 * Merge Tailwind class strings, filtering out falsy values.
 * Intentionally kept dependency-free (no clsx/tailwind-merge needed for basic use).
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

// ─────────────────────────────────────────────
// Date formatting
// ─────────────────────────────────────────────

/**
 * Format a Date or ISO string to a human-readable US date (e.g. "March 21, 2026").
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "N/A";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "Invalid date";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ─────────────────────────────────────────────
// Currency formatting
// ─────────────────────────────────────────────

/**
 * Format a number as a US dollar amount (e.g. "$1,250,000").
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ─────────────────────────────────────────────
// Party color
// ─────────────────────────────────────────────

/**
 * Return a Tailwind text-color class based on political party name.
 */
export function getPartyColor(party: string | null | undefined): string {
  if (!party) return "text-gray-500";
  const normalized = party.trim().toLowerCase();
  if (normalized === "democrat" || normalized === "democratic") {
    return "text-blue-600";
  }
  if (normalized === "republican") {
    return "text-red-600";
  }
  return "text-purple-600"; // Independent / other
}

// ─────────────────────────────────────────────
// Bill status color
// ─────────────────────────────────────────────

/**
 * Return a Tailwind text-color class based on BillStatus.
 */
export function getStatusColor(status: BillStatus | string | null | undefined): string {
  switch (status) {
    case BillStatus.INTRODUCED:
      return "text-gray-500";
    case BillStatus.IN_COMMITTEE:
      return "text-yellow-600";
    case BillStatus.PASSED_HOUSE:
    case BillStatus.PASSED_SENATE:
      return "text-blue-600";
    case BillStatus.SIGNED:
      return "text-green-600";
    case BillStatus.VETOED:
    case BillStatus.FAILED:
      return "text-red-600";
    default:
      return "text-gray-500";
  }
}

// ─────────────────────────────────────────────
// Slug generation
// ─────────────────────────────────────────────

/**
 * Convert a string to a URL-safe slug (e.g. "Hello World!" → "hello-world").
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")   // remove non-word chars (except spaces/hyphens)
    .replace(/[\s_]+/g, "-")    // replace spaces/underscores with hyphens
    .replace(/-+/g, "-")        // collapse multiple hyphens
    .replace(/^-+|-+$/g, "");   // strip leading/trailing hyphens
}
