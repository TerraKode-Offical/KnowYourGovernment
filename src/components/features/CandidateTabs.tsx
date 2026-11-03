"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Phone, Globe, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import PolicyAccordion from "./PolicyAccordion";
import type { PolicyItem } from "./PolicyAccordion";

interface VoteRecord {
  bill: string;
  vote: string;
  date: string;
  description: string;
}

interface FinanceDonor {
  name: string;
  amount: number;
  type: string;
  employer: string | null;
  occupation: string | null;
}

interface FinanceExpenditure {
  category: string;
  amount: number;
}

interface FinanceRecord {
  cycle: number;
  totalRaised: number;
  totalSpent: number;
  cashOnHand: number;
  individualContributions: number;
  pacContributions: number;
  partyContributions: number;
  selfFunding: number;
  topDonors: FinanceDonor[];
  expenditures: FinanceExpenditure[];
}

interface Candidate {
  name: string;
  office: string;
  state: string;
  phone: string;
  email: string;
  website: string;
  policies: PolicyItem[];
  votingRecord: VoteRecord[];
  financeRecords: FinanceRecord[];
}

interface CandidateTabsProps {
  candidate: Candidate;
}

const TABS = ["Policy Positions", "Voting Record", "Campaign Finance", "Contact"];

/** Format a number as a full dollar amount with commas: $1,234,567.89 */
function fmtDollar(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Compact format for summary cards */
function fmtCompact(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return fmtDollar(n);
}

const DONOR_COLORS = [
  "bg-blue-500", "bg-emerald-500", "bg-purple-500", "bg-amber-500", "bg-gray-400",
];

/** Map internal donor type keys to display category names */
const DONOR_TYPE_MAP: Record<string, string> = {
  INDIVIDUAL: "Individual",
  PAC: "PAC",
  PARTY: "Party",
  COMMITTEE: "PAC", // treat COMMITTEE as PAC for display grouping
};

export default function CandidateTabs({ candidate }: CandidateTabsProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedCycle, setSelectedCycle] = useState<number | null>(null);
  const [expandedDonorType, setExpandedDonorType] = useState<string | null>(null);

  // Available cycles sorted descending
  const cycles = useMemo(
    () => candidate.financeRecords.map((f) => f.cycle).sort((a, b) => b - a),
    [candidate.financeRecords]
  );

  // Active cycle defaults to most recent
  const activeCycle = selectedCycle ?? cycles[0] ?? null;

  // Current finance record for the selected cycle
  const cf = useMemo(
    () => candidate.financeRecords.find((f) => f.cycle === activeCycle) ?? null,
    [candidate.financeRecords, activeCycle]
  );

  // Computed donor type breakdown for the active cycle
  const donorTypes = useMemo(() => {
    if (!cf) return [];
    const total = cf.individualContributions + cf.pacContributions + cf.partyContributions + cf.selfFunding;
    if (total === 0) return [];
    return [
      { type: "Individual", pct: Math.round((cf.individualContributions / total) * 100), amount: cf.individualContributions },
      { type: "PAC", pct: Math.round((cf.pacContributions / total) * 100), amount: cf.pacContributions },
      { type: "Party", pct: Math.round((cf.partyContributions / total) * 100), amount: cf.partyContributions },
      { type: "Self-Funding", pct: Math.round((cf.selfFunding / total) * 100), amount: cf.selfFunding },
    ].filter((d) => d.pct > 0);
  }, [cf]);

  // Spending breakdown for the active cycle
  const spending = useMemo(() => {
    if (!cf) return [];
    return cf.expenditures.map((e) => {
      const pct = cf.totalSpent > 0 ? Math.round((e.amount / cf.totalSpent) * 100) : 0;
      return { category: e.category, pct, amount: e.amount };
    });
  }, [cf]);

  // Group top donors by display category for the expanded view
  const donorsByCategory = useMemo(() => {
    if (!cf) return {};
    const groups: Record<string, FinanceDonor[]> = {};
    for (const donor of cf.topDonors) {
      const displayType = DONOR_TYPE_MAP[donor.type] ?? donor.type;
      if (!groups[displayType]) groups[displayType] = [];
      groups[displayType].push(donor);
    }
    return groups;
  }, [cf]);

  return (
    <div>
      {/* Tab nav */}
      <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1 shadow-sm mb-6 overflow-x-auto">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={`flex-1 min-w-max px-4 py-2.5 text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${
              activeTab === i
                ? "bg-[#1B2A4A] text-white shadow-sm"
                : "text-gray-600 hover:text-[#1B2A4A] hover:bg-gray-50"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* -- Policy Tab -- */}
        {activeTab === 0 && (
          <motion.div
            key="policy"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Policy Positions by Category
              </h2>
              <PolicyAccordion policies={candidate.policies as PolicyItem[]} />
            </div>
          </motion.div>
        )}

        {/* -- Voting Record Tab -- */}
        {activeTab === 1 && (
          <motion.div
            key="votes"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Voting Record — Selected Votes
              </h2>
              {candidate.votingRecord.length === 0 ? (
                <p className="text-base text-gray-400 text-center py-8">No voting record available.</p>
              ) : (
                <div className="space-y-2">
                  {(candidate.votingRecord as VoteRecord[]).map((vote) => (
                    <div
                      key={vote.bill}
                      className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 mt-0.5 ${
                          vote.vote === "YES"
                            ? "bg-green-100 text-green-800"
                            : vote.vote === "NO"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {vote.vote}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-semibold text-[#1B2A4A]">{vote.bill}</p>
                        <p className="text-sm text-gray-500 mt-0.5">{vote.description}</p>
                      </div>
                      <span className="text-sm text-gray-400 shrink-0">{vote.date}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* -- Campaign Finance Tab -- */}
        {activeTab === 2 && (
          <motion.div
            key="finance"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            {/* Cycle selector */}
            {cycles.length > 0 && (
              <div className="flex items-center gap-3">
                <label htmlFor="cycle-select" className="text-base font-semibold text-gray-700">
                  Election Cycle:
                </label>
                <select
                  id="cycle-select"
                  value={activeCycle ?? ""}
                  onChange={(e) => {
                    setSelectedCycle(Number(e.target.value));
                    setExpandedDonorType(null);
                  }}
                  className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-base font-medium text-[#1B2A4A] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]/30 focus:border-[#1B2A4A] cursor-pointer"
                >
                  {cycles.map((cycle) => (
                    <option key={cycle} value={cycle}>
                      {cycle}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {!cf ? (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
                <p className="text-base text-gray-400">No campaign finance data available.</p>
              </div>
            ) : (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "Total Raised", value: fmtCompact(cf.totalRaised), color: "text-emerald-600" },
                    { label: "Total Spent", value: fmtCompact(cf.totalSpent), color: "text-red-600" },
                    { label: "Cash on Hand", value: fmtCompact(cf.cashOnHand), color: "text-blue-600" },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
                      <div className={`text-xl font-black ${stat.color}`}>{stat.value}</div>
                      <div className="text-sm text-gray-500 mt-0.5">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Donor type breakdown (clickable/expandable) */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                    Contributions by Source
                  </h3>
                  <div className="space-y-3">
                    {donorTypes.map((d, i) => {
                      const isExpanded = expandedDonorType === d.type;
                      const donors = donorsByCategory[d.type] ?? [];
                      const isSelfFunding = d.type === "Self-Funding";

                      return (
                        <div key={d.type}>
                          <button
                            type="button"
                            onClick={() => setExpandedDonorType(isExpanded ? null : d.type)}
                            className="w-full text-left group cursor-pointer"
                          >
                            <div className="flex items-center justify-between text-base mb-1">
                              <span className="text-gray-700 font-medium flex items-center gap-1.5 group-hover:text-[#1B2A4A] transition-colors">
                                {d.type}
                                {!isSelfFunding && (
                                  isExpanded
                                    ? <ChevronUp size={14} className="text-gray-400" />
                                    : <ChevronDown size={14} className="text-gray-400" />
                                )}
                              </span>
                              <div className="flex items-center gap-3">
                                <span className="text-sm text-gray-400">{fmtDollar(d.amount)}</span>
                                <span className="text-gray-500 font-bold">{d.pct}%</span>
                              </div>
                            </div>
                            <div className="overflow-hidden rounded-full h-2.5 bg-gray-100">
                              <div
                                className={`${DONOR_COLORS[i % DONOR_COLORS.length]} h-full rounded-full`}
                                style={{ width: `${d.pct}%` }}
                              />
                            </div>
                          </button>

                          {/* Expanded donor list */}
                          <AnimatePresence>
                            {isExpanded && !isSelfFunding && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="mt-2 bg-gray-50 rounded-xl border border-gray-100 p-4">
                                  {donors.length === 0 ? (
                                    <p className="text-base text-gray-400 italic">
                                      {d.type === "Individual"
                                        ? "Includes unitemized small donations"
                                        : "No itemized contributions found"}
                                    </p>
                                  ) : (
                                    <div className="space-y-2">
                                      {donors.map((donor, idx) => (
                                        <div
                                          key={`${donor.name}-${idx}`}
                                          className="flex items-start justify-between py-2 border-b border-gray-200/60 last:border-0"
                                        >
                                          <div className="min-w-0 flex-1">
                                            <p className="text-base font-medium text-[#1B2A4A]">{donor.name}</p>
                                            {d.type === "Individual" && (donor.employer || donor.occupation) && (
                                              <p className="text-sm text-gray-500 mt-0.5">
                                                {[donor.occupation, donor.employer].filter(Boolean).join(" at ")}
                                              </p>
                                            )}
                                          </div>
                                          <span className="text-base font-bold text-emerald-600 shrink-0 ml-4">
                                            {fmtDollar(donor.amount)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Top donors */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                    Top Donors
                  </h3>
                  {cf.topDonors.length === 0 ? (
                    <p className="text-base text-gray-400 text-center py-4">No itemized donor data available.</p>
                  ) : (
                    <div className="space-y-2">
                      {cf.topDonors.map((donor, idx) => (
                        <div key={`${donor.name}-${idx}`} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                          <div>
                            <p className="text-base font-medium text-[#1B2A4A]">{donor.name}</p>
                            <p className="text-sm text-gray-400">{DONOR_TYPE_MAP[donor.type] ?? donor.type}</p>
                          </div>
                          <span className="text-base font-bold text-emerald-600">{fmtDollar(donor.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-sm text-gray-400 mt-4">
                    Source: FEC public filings. Data reflects {activeCycle} election cycle.
                  </p>
                </div>

                {/* Spending breakdown */}
                {spending.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                      Spending Breakdown
                    </h3>
                    <div className="space-y-3">
                      {spending.map((item, i) => (
                        <div key={item.category}>
                          <div className="flex items-center justify-between text-base mb-1">
                            <span className="text-gray-700">{item.category}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400 text-sm">{fmtDollar(item.amount)}</span>
                              <span className="font-bold text-[#1B2A4A]">{item.pct}%</span>
                            </div>
                          </div>
                          <div className="overflow-hidden rounded-full h-2 bg-gray-100">
                            <div
                              className={`${DONOR_COLORS[i % DONOR_COLORS.length]} h-full rounded-full`}
                              style={{ width: `${item.pct}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}

        {/* -- Contact Tab -- */}
        {activeTab === 3 && (
          <motion.div
            key="contact"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-5">
                Contact Information
              </h2>
              <div className="space-y-4">
                {[
                  { icon: Phone, label: "Phone", value: candidate.phone, href: `tel:${candidate.phone}` },
                  { icon: Mail, label: "Email", value: candidate.email, href: `mailto:${candidate.email}` },
                  { icon: Globe, label: "Website", value: "Official Website", href: candidate.website },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <a
                      key={item.label}
                      href={item.href}
                      target={item.label === "Website" ? "_blank" : undefined}
                      rel={item.label === "Website" ? "noopener noreferrer" : undefined}
                      className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 hover:bg-[#1B2A4A]/5 transition-colors group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm ring-1 ring-black/5">
                        <Icon size={18} className="text-[#1B2A4A]" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">{item.label}</p>
                        <p className="text-base font-semibold text-[#1B2A4A] group-hover:underline flex items-center gap-1">
                          {item.value}
                          {item.label === "Website" && <ExternalLink size={11} />}
                        </p>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
