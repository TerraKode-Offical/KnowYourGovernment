"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2, DollarSign, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import {
  FEDERAL_AGENCIES,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  type AgencyCategory,
  type FederalAgency,
} from "@/lib/agencies";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Format large dollar amounts as compact strings (e.g. $1.2T, $340B). */
function formatBudget(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1e12) return `$${(amount / 1e12).toFixed(1)}T`;
  if (abs >= 1e9) return `$${(amount / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(amount / 1e6).toFixed(0)}M`;
  return `$${amount.toLocaleString()}`;
}

// ─────────────────────────────────────────────
// Subcomponents
// ─────────────────────────────────────────────

function AgencyCard({ agency }: { agency: FederalAgency }) {
  const categoryColor = CATEGORY_COLORS[agency.category];

  return (
    <Link
      href={`/agencies/${agency.abbreviation.toLowerCase()}`}
      className="group flex flex-col gap-3 p-5 rounded-xl border border-gray-200 bg-white
                 hover:border-[#1B2A4A]/30 hover:shadow-lg transition-all duration-200"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-[#1B2A4A]/10 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-[#1B2A4A]">{agency.abbreviation}</span>
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-[#1B2A4A] text-sm leading-snug group-hover:underline">
              {agency.name}
            </h3>
            <span className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${categoryColor}`}>
              {CATEGORY_LABELS[agency.category]}
            </span>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">
        {agency.description}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
        <span className="inline-flex items-center gap-1 text-xs font-medium text-[#1B2A4A]/70 group-hover:gap-2 transition-all">
          View details <ArrowRight size={12} />
        </span>
        <span
          role="link"
          className="text-xs text-gray-400 hover:text-gray-600 inline-flex items-center gap-1"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            window.open(agency.url, "_blank", "noopener,noreferrer");
          }}
        >
          Official site <ExternalLink size={10} />
        </span>
      </div>
    </Link>
  );
}

// ─────────────────────────────────────────────
// Category filter chips
// ─────────────────────────────────────────────

const ALL_CATEGORIES: AgencyCategory[] = [
  "defense", "health", "social", "economy", "environment",
  "justice", "infrastructure", "science", "education",
];

// ─────────────────────────────────────────────
// Main section
// ─────────────────────────────────────────────

/** Number of agencies to show before "Show All" is clicked */
const INITIAL_COUNT = 8;

export default function FederalAgenciesSection() {
  const [selectedCategory, setSelectedCategory] = useState<AgencyCategory | null>(null);
  const [showAll, setShowAll] = useState(false);

  const filtered = selectedCategory
    ? FEDERAL_AGENCIES.filter((a) => a.category === selectedCategory)
    : FEDERAL_AGENCIES;

  const displayed = showAll ? filtered : filtered.slice(0, INITIAL_COUNT);
  const hasMore = filtered.length > INITIAL_COUNT;

  return (
    <section className="bg-white py-16 sm:py-20 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 text-sm font-medium text-[#1B2A4A]/60 mb-2">
              <Building2 size={16} />
              Federal Government
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#1B2A4A] mb-2">
              Federal Agencies
            </h2>
            <p className="text-gray-500 max-w-2xl">
              Track how federal agencies are funded, what legislation affects them,
              and how budget changes impact the programs you rely on.
            </p>
          </div>
          <Link
            href="/agencies"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#1B2A4A] hover:text-blue-700 transition-colors whitespace-nowrap"
          >
            View all agencies <ArrowRight size={14} />
          </Link>
        </div>

        {/* Category filter chips */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => { setSelectedCategory(null); setShowAll(false); }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors
              ${selectedCategory === null
                ? "bg-[#1B2A4A] text-white border-[#1B2A4A]"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`}
          >
            All Agencies
          </button>
          {ALL_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => { setSelectedCategory(cat); setShowAll(false); }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors
                ${selectedCategory === cat
                  ? "bg-[#1B2A4A] text-white border-[#1B2A4A]"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* Agency grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {displayed.map((agency) => (
            <AgencyCard key={agency.abbreviation} agency={agency} />
          ))}
        </div>

        {/* Show more / less */}
        {hasMore && !selectedCategory && (
          <div className="flex justify-center mt-8">
            <button
              onClick={() => setShowAll((prev) => !prev)}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold
                         text-[#1B2A4A] border border-[#1B2A4A]/30 rounded-lg
                         hover:bg-[#1B2A4A]/5 transition-colors"
            >
              {showAll ? (
                <>Show Less <ChevronUp size={14} /></>
              ) : (
                <>Show All {FEDERAL_AGENCIES.length} Agencies <ChevronDown size={14} /></>
              )}
            </button>
          </div>
        )}

        {/* Budget context note */}
        <div className="mt-8 flex items-start gap-3 p-4 rounded-lg bg-gray-50 border border-gray-200">
          <DollarSign size={18} className="text-[#1B2A4A]/50 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-gray-500 leading-relaxed">
            Budget and spending data is sourced from{" "}
            <a
              href="https://www.usaspending.gov"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline font-medium"
            >
              USAspending.gov
            </a>
            , the official source for federal spending data maintained by the U.S. Treasury.
            Figures are updated regularly and reflect the current fiscal year.
          </p>
        </div>
      </div>
    </section>
  );
}
