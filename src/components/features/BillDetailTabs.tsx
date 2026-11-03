"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  Minus,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface Rider {
  id: string;
  severity: "red" | "orange" | "yellow";
  title: string;
  section: string;
  plainEnglish: string;
  concern: string;
  votesFor: number;
  votesAgainst: number;
}

interface TimelineStep {
  label: string;
  date: string;
  done: boolean;
}

interface Bill {
  number: string;
  title: string;
  aiSummary: string;
  subjects: string[];
  sponsor: { name: string; party: string; district: string };
  chamber: string;
  introducedDate: string;
  lastActionDate: string;
  lastAction: string;
  statusTimeline: TimelineStep[];
  riders: Rider[];
  fullTextUrl: string;
  voteResults: {
    house: { yes: number; no: number; abstain: number; total: number };
    partyBreakdown: { dem: { yes: number; no: number }; rep: { yes: number; no: number } };
  };
}

interface BillDetailTabsProps {
  bill: Bill;
}

const TABS = ["Overview", "Hidden Clauses & Riders", "Vote Results", "Full Text"];

const SEVERITY_CONFIG = {
  red: {
    bg: "bg-red-50",
    border: "border-red-200",
    dot: "bg-red-500",
    badge: "bg-red-100 text-red-800",
    label: "High Concern",
    icon: "text-red-500",
  },
  orange: {
    bg: "bg-orange-50",
    border: "border-orange-200",
    dot: "bg-orange-500",
    badge: "bg-orange-100 text-orange-800",
    label: "Moderate Concern",
    icon: "text-orange-500",
  },
  yellow: {
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    dot: "bg-yellow-400",
    badge: "bg-yellow-100 text-yellow-800",
    label: "Low Concern",
    icon: "text-yellow-600",
  },
};

function pct(n: number, total: number) {
  if (!total) return 0;
  return Math.round((n / total) * 100);
}

export default function BillDetailTabs({ bill }: BillDetailTabsProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [expandedRider, setExpandedRider] = useState<string | null>(null);

  const votes = bill.voteResults.house;
  const pb = bill.voteResults.partyBreakdown;

  return (
    <div>
      {/* Tab nav */}
      <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1 shadow-sm mb-6 overflow-x-auto">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={`relative flex-1 min-w-max px-4 py-2.5 text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${
              activeTab === i
                ? "bg-[#1B2A4A] text-white shadow-sm"
                : "text-gray-600 hover:text-[#1B2A4A] hover:bg-gray-50"
            }`}
          >
            {tab}
            {i === 1 && bill.riders.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-amber-500 text-white rounded-full">
                {bill.riders.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── Overview Tab ── */}
        {activeTab === 0 && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* AI Summary — hidden until an analysis exists */}
            {bill.aiSummary && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Plain-English Summary (AI-assisted)
                </h2>
                <p className="text-gray-700 leading-relaxed">{bill.aiSummary}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {bill.subjects.map((s) => (
                    <span key={s} className="text-xs bg-[#1B2A4A]/8 text-[#1B2A4A]/80 px-2.5 py-1 rounded-full font-medium">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Status timeline */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-5">
                Legislative Status Timeline
              </h2>
              <div className="relative">
                <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-gray-200" />
                <div className="space-y-5">
                  {bill.statusTimeline.map((step, i) => (
                    <div key={i} className="flex items-start gap-4 pl-1">
                      <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        step.done ? "bg-green-500" : "bg-gray-200"
                      }`}>
                        {step.done ? (
                          <CheckCircle2 size={16} className="text-white" />
                        ) : (
                          <Circle size={16} className="text-gray-400" />
                        )}
                      </div>
                      <div className="pb-1">
                        <p className={`text-sm font-semibold ${step.done ? "text-[#1B2A4A]" : "text-gray-400"}`}>
                          {step.label}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{step.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sponsor info */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Sponsor
              </h2>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 font-bold text-sm">
                  {bill.sponsor.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1B2A4A]">{bill.sponsor.name}</p>
                  <p className="text-xs text-gray-500">
                    {bill.sponsor.party === "D" ? "Democrat" : bill.sponsor.party === "R" ? "Republican" : "Independent"} · {bill.sponsor.district}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Riders Tab ── */}
        {activeTab === 1 && (
          <motion.div
            key="riders"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            {bill.riders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
                <CheckCircle2 size={40} className="text-green-500 mx-auto mb-3" />
                <h3 className="font-bold text-[#1B2A4A] mb-1">No Riders Detected</h3>
                <p className="text-sm text-gray-500">
                  Our AI analysis found no hidden clauses or unrelated provisions in this bill.
                </p>
              </div>
            ) : (
              <>
                {/* Explainer */}
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-amber-900 mb-1">What Are Legislative Riders?</h3>
                      <p className="text-sm text-amber-800 leading-relaxed">
                        A <strong>rider</strong> is a provision attached to a bill that is often unrelated to the bill's main purpose.
                        Riders are a common legislative tactic — they're attached to popular or must-pass bills to avoid standalone debate.
                        Our AI flags these so you can evaluate a bill beyond its headline.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Severity legend */}
                <div className="flex items-center gap-4 flex-wrap text-xs font-medium">
                  <span className="text-gray-500">Severity:</span>
                  {(["red", "orange", "yellow"] as const).map((s) => (
                    <span key={s} className="flex items-center gap-1.5">
                      <span className={`w-3 h-3 rounded-full ${SEVERITY_CONFIG[s].dot}`} />
                      {SEVERITY_CONFIG[s].label}
                    </span>
                  ))}
                </div>

                {/* Rider cards */}
                {bill.riders.map((rider) => {
                  const config = SEVERITY_CONFIG[rider.severity];
                  const isExpanded = expandedRider === rider.id;

                  return (
                    <div key={rider.id} className={`rounded-2xl border ${config.border} ${config.bg} overflow-hidden shadow-sm`}>
                      <button
                        className="w-full p-5 text-left hover:brightness-[0.98] transition-all"
                        onClick={() => setExpandedRider(isExpanded ? null : rider.id)}
                        aria-expanded={isExpanded}
                      >
                        <div className="flex items-start gap-3">
                          <span className={`mt-1 w-4 h-4 rounded-full ${config.dot} shrink-0`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 flex-wrap">
                              <h3 className="font-bold text-gray-900 text-base leading-snug">
                                {rider.title}
                              </h3>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${config.badge}`}>
                                {config.label}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 mt-1 font-mono">{rider.section}</p>
                          </div>
                          <span className="shrink-0 text-gray-500">
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </span>
                        </div>
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="overflow-hidden"
                          >
                            <div className="px-5 pb-5 space-y-4">
                              <div>
                                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                  What does this say in plain English?
                                </h4>
                                <p className="text-sm text-gray-700 leading-relaxed">{rider.plainEnglish}</p>
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                  Why is this concerning?
                                </h4>
                                <p className="text-sm text-gray-700 leading-relaxed">{rider.concern}</p>
                              </div>
                              <div className="flex items-center gap-4 pt-2 border-t border-gray-200/50">
                                <span className="text-xs text-gray-500">Expert consensus on concern level:</span>
                                <div className="flex items-center gap-1.5 text-xs font-medium text-red-700">
                                  <ThumbsDown size={13} /> {rider.votesAgainst} concerned
                                </div>
                                <div className="flex items-center gap-1.5 text-xs font-medium text-green-700">
                                  <ThumbsUp size={13} /> {rider.votesFor} not concerned
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </>
            )}
          </motion.div>
        )}

        {/* ── Vote Results Tab ── */}
        {activeTab === 2 && (
          <motion.div
            key="votes"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {votes.total === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                <Minus size={40} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No vote data available for this bill yet.</p>
              </div>
            ) : (
              <>
                {/* Overall results */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-6">
                    House Floor Vote
                  </h2>

                  <div className="grid grid-cols-3 gap-4 mb-6">
                    {[
                      { label: "YES", count: votes.yes, color: "bg-green-500", textColor: "text-green-700", bg: "bg-green-50" },
                      { label: "NO", count: votes.no, color: "bg-red-500", textColor: "text-red-700", bg: "bg-red-50" },
                      { label: "ABSTAIN", count: votes.abstain, color: "bg-gray-400", textColor: "text-gray-600", bg: "bg-gray-50" },
                    ].map((v) => (
                      <div key={v.label} className={`${v.bg} rounded-xl p-4 text-center`}>
                        <div className={`text-3xl font-black ${v.textColor}`}>{v.count}</div>
                        <div className="text-xs font-bold text-gray-500 mt-1">{v.label}</div>
                        <div className="text-xs text-gray-400">{pct(v.count, votes.total)}%</div>
                      </div>
                    ))}
                  </div>

                  {/* Visual bar */}
                  <div className="overflow-hidden rounded-full h-4 bg-gray-100 flex">
                    <div
                      className="bg-green-500 h-full transition-all"
                      style={{ width: `${pct(votes.yes, votes.total)}%` }}
                      title={`YES: ${pct(votes.yes, votes.total)}%`}
                    />
                    <div
                      className="bg-red-500 h-full transition-all"
                      style={{ width: `${pct(votes.no, votes.total)}%` }}
                      title={`NO: ${pct(votes.no, votes.total)}%`}
                    />
                    <div
                      className="bg-gray-400 h-full transition-all"
                      style={{ width: `${pct(votes.abstain, votes.total)}%` }}
                      title={`ABSTAIN: ${pct(votes.abstain, votes.total)}%`}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-2 text-center">
                    Required: Simple majority (218 of {votes.total})
                  </p>
                </div>

                {/* Party breakdown */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-5">
                    Party Split
                  </h2>
                  <div className="space-y-4">
                    {[
                      { party: "Democrat", data: pb.dem, color: "bg-blue-500", light: "bg-blue-50" },
                      { party: "Republican", data: pb.rep, color: "bg-red-500", light: "bg-red-50" },
                    ].map((row) => (
                      <div key={row.party}>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="font-semibold text-[#1B2A4A]">{row.party}</span>
                          <span className="text-gray-500 text-xs">
                            {row.data.yes} YES · {row.data.no} NO
                          </span>
                        </div>
                        <div className="overflow-hidden rounded-full h-3 bg-gray-100 flex">
                          <div
                            className={`${row.color} h-full`}
                            style={{ width: `${pct(row.data.yes, row.data.yes + row.data.no)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] text-gray-400 mt-1">
                          <span>YES: {pct(row.data.yes, row.data.yes + row.data.no)}%</span>
                          <span>NO: {pct(row.data.no, row.data.yes + row.data.no)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* ── Full Text Tab ── */}
        {activeTab === 3 && (
          <motion.div
            key="text"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
              <FileText size={48} className="text-[#1B2A4A]/20 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-[#1B2A4A] mb-2">Full Bill Text</h3>
              <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
                The complete legislative text is hosted on Congress.gov. Opens in a new tab.
              </p>
              <a
                href={bill.fullTextUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#1B2A4A] text-white font-semibold text-sm px-6 py-3 rounded-lg hover:bg-[#2D4066] transition-colors"
              >
                View on Congress.gov <ExternalLink size={14} />
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
