"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Check, Minus, ChevronDown, User, Loader2, AlertCircle, Info } from "lucide-react";
import PartyBadge from "@/components/ui/PartyBadge";
import Link from "next/link";
import { apiErrorMessage } from "@/lib/api-client";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface CandidatePolicy {
  id: number;
  category: string;
  summary: string;
  lastAnalyzedAt: string | null;
}

interface CandidateFromAPI {
  id: number;
  name: string;
  party: string;
  photoUrl: string | null;
  biography: string | null;
  websiteUrl: string | null;
  officeType: string;
  district: string | null;
  isIncumbent: boolean;
  stateId: number | null;
  state: { id: number; name: string; abbreviation: string; fipsCode: string } | null;
  policies: CandidatePolicy[];
}

// ─────────────────────────────────────────────
// Policy category display mapping (DB enum -> display label)
// ─────────────────────────────────────────────

const POLICY_DISPLAY: Record<string, string> = {
  ECONOMY: "Economy & Taxes",
  HEALTHCARE: "Healthcare",
  EDUCATION: "Education",
  IMMIGRATION: "Immigration",
  ENVIRONMENT: "Climate & Environment",
  GUN_POLICY: "Gun Policy",
  FOREIGN_POLICY: "Foreign Policy",
  CRIMINAL_JUSTICE: "Criminal Justice",
  HOUSING: "Housing",
  OTHER: "Other Issues",
};

const POLICY_CATEGORIES = Object.keys(POLICY_DISPLAY);

// ─────────────────────────────────────────────
// Office type display mapping
// ─────────────────────────────────────────────

function formatOffice(officeType: string, district?: string | null): string {
  const labels: Record<string, string> = {
    PRESIDENT: "President",
    US_SENATOR: "U.S. Senator",
    US_REPRESENTATIVE: "U.S. Representative",
    GOVERNOR: "Governor",
    STATE_SENATOR: "State Senator",
    STATE_REP: "State Representative",
    OTHER: "Elected Official",
  };
  const base = labels[officeType] ?? officeType;
  return district ? `${base} - Dist. ${district}` : base;
}

// ─────────────────────────────────────────────
// Party code helper (DB stores "D", "R", etc.)
// ─────────────────────────────────────────────

function partyCode(party: string): string {
  return party;
}

// ─────────────────────────────────────────────
// Stance inference from policy summary text
// (Since the DB stores free-text summaries, we don't have
//  explicit supports/opposes. We just show the summary.)
// ─────────────────────────────────────────────

const STANCE_ICONS = {
  has_policy: { icon: Check, color: "text-emerald-600", bg: "bg-emerald-50", label: "Position Available" },
  no_data: { icon: Minus, color: "text-gray-500", bg: "bg-gray-50", label: "No Data" },
};

export default function CompareTable() {
  const [candidates, setCandidates] = useState<CandidateFromAPI[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stateFilter, setStateFilter] = useState("");

  // Fetch candidates
  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (stateFilter) params.set("stateAbbr", stateFilter.toUpperCase());

      const res = await fetch("/api/candidates" + (params.toString() ? `?${params}` : ""));
      const json = await res.json();

      if (!res.ok) {
        setError(apiErrorMessage(json, "Failed to load candidates."));
        setCandidates([]);
        return;
      }

      setCandidates(json.candidates ?? []);

      // Auto-select first 2 candidates if none selected yet
      if (selectedIds.length === 0 && json.candidates?.length >= 2) {
        setSelectedIds([json.candidates[0].id, json.candidates[1].id]);
      }
    } catch {
      setError("Unable to load candidates. Please try again later.");
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }, [stateFilter]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  const selectedCandidates = candidates.filter((c) => selectedIds.includes(c.id));

  function toggleCandidate(id: number) {
    if (selectedIds.includes(id)) {
      if (selectedIds.length > 2) setSelectedIds(selectedIds.filter((s) => s !== id));
    } else if (selectedIds.length < 4) {
      setSelectedIds([...selectedIds, id]);
    }
  }

  // Helper to get a candidate's policy for a given category
  function getCandidatePolicy(candidate: CandidateFromAPI, category: string): CandidatePolicy | undefined {
    return candidate.policies.find((p) => p.category === category);
  }

  // Get unique states for the filter
  const availableStates = Array.from(
    new Set(candidates.filter((c) => c.state).map((c) => c.state!.abbreviation))
  ).sort();

  // ─────────────────────────────────────────────
  // Loading state
  // ─────────────────────────────────────────────

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
        <Loader2 size={32} className="text-[#1B2A4A] animate-spin mx-auto mb-4" />
        <p className="text-sm text-gray-500">Loading candidates...</p>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // Error state
  // ─────────────────────────────────────────────

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
        <div className="flex items-start gap-3 text-red-700">
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Could not load candidates</p>
            <p className="text-sm mt-1">{error}</p>
            <button
              onClick={fetchCandidates}
              className="mt-3 text-sm font-medium text-[#1B2A4A] underline hover:no-underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // Empty state
  // ─────────────────────────────────────────────

  if (candidates.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
        <User size={48} className="text-gray-300 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-[#1B2A4A] mb-2">No Candidates Available</h2>
        <p className="text-sm text-gray-500 mb-4">
          {stateFilter
            ? `No candidates found for ${stateFilter.toUpperCase()}. Try selecting a different state.`
            : "Candidate data has not been loaded into the database yet. Check back soon."}
        </p>
        {stateFilter && (
          <button
            onClick={() => { setStateFilter(""); setSelectedIds([]); }}
            className="text-sm font-medium text-[#1B2A4A] underline hover:no-underline"
          >
            Clear filter
          </button>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // Main render
  // ─────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* State filter */}
      {availableStates.length > 1 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <label className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 block">
            Filter by State
          </label>
          <select
            value={stateFilter}
            onChange={(e) => { setStateFilter(e.target.value); setSelectedIds([]); }}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]/30 focus:border-[#1B2A4A]/50"
          >
            <option value="">All States</option>
            {availableStates.map((abbr) => (
              <option key={abbr} value={abbr}>{abbr}</option>
            ))}
          </select>
        </div>
      )}

      {/* Candidate selector */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Select Candidates to Compare (2-4)
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {candidates.slice(0, 12).map((c) => {
            const selected = selectedIds.includes(c.id);
            return (
              <button
                key={c.id}
                onClick={() => toggleCandidate(c.id)}
                className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all text-center ${
                  selected
                    ? "border-[#1B2A4A] bg-[#1B2A4A]/5"
                    : "border-gray-200 hover:border-[#1B2A4A]/30 hover:bg-gray-50"
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selected ? "bg-[#1B2A4A]" : "bg-gray-100"}`}>
                  <User size={18} className={selected ? "text-white" : "text-gray-400"} />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#1B2A4A] leading-tight">{c.name}</p>
                  <p className="text-[10px] text-gray-400">{formatOffice(c.officeType, c.district)}</p>
                  {c.state && <p className="text-[10px] text-gray-400">{c.state.abbreviation}</p>}
                </div>
                <PartyBadge party={partyCode(c.party)} size="xs" />
                {selected && (
                  <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#1B2A4A] rounded-full flex items-center justify-center">
                    <Check size={10} className="text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
        {candidates.length > 12 && (
          <p className="text-xs text-gray-400 mt-3">
            Showing first 12 candidates. Use the state filter to narrow results.
          </p>
        )}
        <p className="text-xs text-gray-400 mt-3">
          {selectedIds.length < 2 ? "Select at least 2 candidates to compare." : `Comparing ${selectedIds.length} candidates.`}
        </p>
      </div>

      {/* Comparison table */}
      {selectedCandidates.length >= 2 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
        >
          {/* Header row */}
          <div className="grid gap-px bg-gray-100" style={{ gridTemplateColumns: `1fr repeat(${selectedCandidates.length}, 1fr)` }}>
            <div className="bg-[#1B2A4A] p-4">
              <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">Issue</p>
            </div>
            {selectedCandidates.map((c) => (
              <div key={c.id} className="bg-[#1B2A4A] p-4 text-center">
                <div className="flex flex-col items-center gap-1.5">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                    <User size={15} className="text-white/60" />
                  </div>
                  <p className="text-sm font-bold text-white leading-tight">{c.name}</p>
                  <PartyBadge party={partyCode(c.party)} size="xs" showFullName />
                  <p className="text-[10px] text-white/50">{formatOffice(c.officeType, c.district)}</p>
                  <Link
                    href={`/candidate/${c.id}`}
                    className="text-[10px] text-blue-300 hover:text-blue-200 underline"
                  >
                    Full Profile
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Policy rows */}
          {POLICY_CATEGORIES.map((category) => {
            const isExpanded = expandedCategory === category;
            const displayLabel = POLICY_DISPLAY[category] ?? category;

            // Check if any selected candidate has data for this category
            const anyHasData = selectedCandidates.some((c) => getCandidatePolicy(c, category));
            if (!anyHasData) return null;

            return (
              <div key={category} className="border-b border-gray-100 last:border-0">
                {/* Row */}
                <button
                  onClick={() => setExpandedCategory(isExpanded ? null : category)}
                  className="w-full"
                  aria-expanded={isExpanded}
                >
                  <div className="grid gap-px bg-gray-100" style={{ gridTemplateColumns: `1fr repeat(${selectedCandidates.length}, 1fr)` }}>
                    {/* Category label */}
                    <div className="bg-white p-4 flex items-center gap-2">
                      <span className="font-semibold text-sm text-[#1B2A4A] text-left">{displayLabel}</span>
                      <ChevronDown
                        size={14}
                        className={`text-gray-400 ml-auto shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      />
                    </div>

                    {/* Each candidate's stance */}
                    {selectedCandidates.map((c) => {
                      const policy = getCandidatePolicy(c, category);
                      if (!policy) {
                        const config = STANCE_ICONS.no_data;
                        const Icon = config.icon;
                        return (
                          <div key={c.id} className={`${config.bg} p-4 flex flex-col items-center gap-1 text-center`}>
                            <div className="w-7 h-7 rounded-full bg-white/70 flex items-center justify-center">
                              <Icon size={15} className={config.color} />
                            </div>
                            <span className={`text-[10px] font-bold ${config.color}`}>{config.label}</span>
                          </div>
                        );
                      }
                      const config = STANCE_ICONS.has_policy;
                      const Icon = config.icon;
                      return (
                        <div key={c.id} className={`${config.bg} p-4 flex flex-col items-center gap-1 text-center`}>
                          <div className="w-7 h-7 rounded-full bg-white/70 flex items-center justify-center">
                            <Icon size={15} className={config.color} />
                          </div>
                          <span className={`text-[10px] font-bold ${config.color}`}>{config.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="grid bg-gray-50" style={{ gridTemplateColumns: `1fr repeat(${selectedCandidates.length}, 1fr)` }}>
                    <div className="p-4" />
                    {selectedCandidates.map((c) => {
                      const policy = getCandidatePolicy(c, category);
                      return (
                        <div key={c.id} className="p-4 border-l border-gray-100">
                          <p className="text-xs text-gray-600 leading-relaxed">
                            {policy?.summary ?? "No data available for this policy area."}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Show message if no policy data at all */}
          {!POLICY_CATEGORIES.some((cat) => selectedCandidates.some((c) => getCandidatePolicy(c, cat))) && (
            <div className="p-8 text-center">
              <Info size={24} className="text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">
                No policy position data is available for the selected candidates yet.
                Visit their full profiles for more information.
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-5 flex-wrap text-xs font-medium">
        <span className="text-gray-400 uppercase tracking-wider text-[10px]">Legend:</span>
        {Object.entries(STANCE_ICONS).map(([key, val]) => {
          const Icon = val.icon;
          return (
            <span key={key} className="flex items-center gap-1.5">
              <Icon size={13} className={val.color} />
              {val.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
