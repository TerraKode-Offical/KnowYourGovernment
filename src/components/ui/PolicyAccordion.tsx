"use client";

import { useState, useId } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  ChevronDown,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  ExternalLink,
  BookOpen,
} from "lucide-react";
import AiDisclaimer from "./AiDisclaimer";
import type { PolicyCategory } from "@/types";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface PolicySource {
  title: string;
  url: string;
  publisher?: string;
  date?: string;
}

export interface PolicyPosition {
  id: string | number;
  category: PolicyCategory | string;
  title: string;
  /** 1–2 sentence overview shown in collapsed state */
  summary: string;
  /** Arguments from those who support this position */
  supportersArguments?: string;
  /** Arguments from those who oppose this position */
  criticsArguments?: string;
  /** AI-generated balanced analysis */
  aiAnalysis?: string;
  /** Source articles / primary documents */
  sources?: PolicySource[];
}

export interface PolicyAccordionProps {
  positions: PolicyPosition[];
  /** Pre-open the first item */
  defaultOpenFirst?: boolean;
  /** Allow multiple items open simultaneously */
  allowMultiple?: boolean;
  className?: string;
}

// ─────────────────────────────────────────────
// Animation variants
// ─────────────────────────────────────────────

const panelVariants: Variants = {
  hidden: {
    height: 0,
    opacity: 0,
    transition: { duration: 0.22, ease: "easeIn" as const },
  },
  visible: {
    height: "auto",
    opacity: 1,
    transition: { duration: 0.28, ease: "easeOut" as const },
  },
};

// ─────────────────────────────────────────────
// Single accordion item
// ─────────────────────────────────────────────

interface AccordionItemProps {
  position: PolicyPosition;
  isOpen: boolean;
  onToggle: () => void;
  index: number;
  uid: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  ECONOMY:          "bg-emerald-100 text-emerald-800",
  HEALTHCARE:       "bg-rose-100 text-rose-800",
  EDUCATION:        "bg-sky-100 text-sky-800",
  IMMIGRATION:      "bg-amber-100 text-amber-800",
  ENVIRONMENT:      "bg-green-100 text-green-800",
  GUN_POLICY:       "bg-slate-100 text-slate-700",
  FOREIGN_POLICY:   "bg-indigo-100 text-indigo-800",
  CRIMINAL_JUSTICE: "bg-orange-100 text-orange-800",
  HOUSING:          "bg-violet-100 text-violet-800",
  OTHER:            "bg-gray-100 text-gray-700",
};

function categoryColor(cat: string): string {
  return CATEGORY_COLORS[cat.toUpperCase()] ?? CATEGORY_COLORS.OTHER;
}

function AccordionItem({ position, isOpen, onToggle, uid }: AccordionItemProps) {
  const headingId = `${uid}-heading`;
  const panelId   = `${uid}-panel`;

  const {
    category,
    title,
    summary,
    supportersArguments,
    criticsArguments,
    aiAnalysis,
    sources,
  } = position;

  return (
    <div
      className={[
        "border rounded-xl overflow-hidden transition-shadow duration-150",
        isOpen
          ? "border-[#2B6CB0]/40 shadow-md"
          : "border-gray-200 hover:border-gray-300 shadow-sm hover:shadow",
      ].join(" ")}
    >
      {/* ── Header / toggle button ── */}
      <h3 id={headingId}>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={panelId}
          className={[
            "w-full flex items-center gap-3 px-5 py-4 text-left",
            "transition-colors duration-150 focus-visible:outline-none",
            "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2B6CB0]",
            isOpen ? "bg-[#1B2A4A]/5" : "bg-white hover:bg-gray-50",
          ].join(" ")}
        >
          {/* Category pill */}
          <span
            className={`flex-shrink-0 text-[10px] font-semibold uppercase tracking-wider
                        px-2 py-0.5 rounded-full ${categoryColor(String(category))}`}
            aria-hidden="true"
          >
            {String(category).replace(/_/g, " ")}
          </span>

          {/* Title */}
          <span className="flex-1 font-serif font-semibold text-[#1B2A4A] text-sm sm:text-base leading-snug">
            {title}
          </span>

          {/* Chevron */}
          <motion.span
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0 text-gray-400"
            aria-hidden="true"
          >
            <ChevronDown size={20} />
          </motion.span>
        </button>
      </h3>

      {/* ── Expandable panel ── */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.section
            key="panel"
            id={panelId}
            role="region"
            aria-labelledby={headingId}
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-3 bg-white space-y-5">
              {/* Summary */}
              <p className="text-sm text-gray-700 leading-relaxed border-l-4 border-[#2B6CB0]/30 pl-4 py-1">
                {summary}
              </p>

              {/* Supporters & Critics side-by-side */}
              {(supportersArguments || criticsArguments) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {supportersArguments && (
                    <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <ThumbsUp
                          size={14}
                          className="text-green-600 flex-shrink-0"
                          aria-hidden="true"
                        />
                        <span className="text-xs font-semibold text-green-800 uppercase tracking-wide">
                          Supporters Say
                        </span>
                      </div>
                      <p className="text-xs text-green-900 leading-relaxed">
                        {supportersArguments}
                      </p>
                    </div>
                  )}
                  {criticsArguments && (
                    <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <ThumbsDown
                          size={14}
                          className="text-red-600 flex-shrink-0"
                          aria-hidden="true"
                        />
                        <span className="text-xs font-semibold text-red-800 uppercase tracking-wide">
                          Critics Say
                        </span>
                      </div>
                      <p className="text-xs text-red-900 leading-relaxed">
                        {criticsArguments}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* AI Analysis */}
              {aiAnalysis && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <Sparkles
                      size={15}
                      className="text-[#2B6CB0] flex-shrink-0"
                      aria-hidden="true"
                    />
                    <span className="text-xs font-semibold text-[#1B2A4A] uppercase tracking-wide">
                      AI Analysis
                    </span>
                  </div>
                  <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                    <p className="text-xs text-blue-900 leading-relaxed">{aiAnalysis}</p>
                  </div>
                  <AiDisclaimer variant="inline" showLearnMore />
                </div>
              )}

              {/* Sources */}
              {sources && sources.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <BookOpen
                      size={13}
                      className="text-gray-500 flex-shrink-0"
                      aria-hidden="true"
                    />
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Sources
                    </span>
                  </div>
                  <ul className="space-y-1.5" role="list">
                    {sources.map((src, i) => (
                      <li key={i}>
                        <a
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-start gap-1.5 text-xs text-[#2B6CB0]
                                     hover:text-[#1B2A4A] transition-colors group
                                     focus-visible:outline-none focus-visible:underline"
                        >
                          <ExternalLink
                            size={11}
                            aria-hidden="true"
                            className="flex-shrink-0 mt-0.5"
                          />
                          <span>
                            <span className="underline underline-offset-2 group-hover:no-underline">
                              {src.title}
                            </span>
                            {src.publisher && (
                              <span className="text-gray-500 ml-1 no-underline">
                                — {src.publisher}
                              </span>
                            )}
                            {src.date && (
                              <span className="text-gray-400 ml-1 no-underline">
                                ({src.date})
                              </span>
                            )}
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main PolicyAccordion Component
// ─────────────────────────────────────────────

export default function PolicyAccordion({
  positions,
  defaultOpenFirst = false,
  allowMultiple = false,
  className = "",
}: PolicyAccordionProps) {
  const baseId = useId();

  const [openIds, setOpenIds] = useState<Set<string | number>>(() => {
    if (defaultOpenFirst && positions.length > 0) {
      return new Set([positions[0].id]);
    }
    return new Set();
  });

  const toggle = (id: string | number) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (!allowMultiple) next.clear();
        next.add(id);
      }
      return next;
    });
  };

  if (!positions || positions.length === 0) {
    return (
      <div
        className={`text-center py-10 text-sm text-gray-500 ${className}`}
        aria-live="polite"
      >
        No policy positions available.
      </div>
    );
  }

  return (
    <div
      className={`space-y-3 ${className}`}
      role="list"
      aria-label="Policy positions accordion"
    >
      {positions.map((position, index) => (
        <div key={position.id} role="listitem">
          <AccordionItem
            position={position}
            isOpen={openIds.has(position.id)}
            onToggle={() => toggle(position.id)}
            index={index}
            uid={`${baseId}-${position.id}`}
          />
        </div>
      ))}
    </div>
  );
}
