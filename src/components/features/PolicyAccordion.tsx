"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface PolicyItem {
  category: string;
  summary: string;
  details: string;
  stance: "supports" | "opposes" | "neutral" | "mixed";
}

interface PolicyAccordionProps {
  policies: PolicyItem[];
}

const STANCE_CONFIG = {
  supports: { label: "Supports", class: "bg-green-100 text-green-800" },
  opposes: { label: "Opposes", class: "bg-red-100 text-red-800" },
  neutral: { label: "Neutral", class: "bg-gray-100 text-gray-700" },
  mixed: { label: "Mixed", class: "bg-amber-100 text-amber-800" },
};

export default function PolicyAccordion({ policies }: PolicyAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden bg-white">
      {policies.map((policy, idx) => {
        const isOpen = openIndex === idx;
        const stance = STANCE_CONFIG[policy.stance];

        return (
          <div key={policy.category}>
            <button
              onClick={() => setOpenIndex(isOpen ? null : idx)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors group"
              aria-expanded={isOpen}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-semibold text-[#1B2A4A] text-sm truncate">
                  {policy.category}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide shrink-0 ${stance.class}`}
                >
                  {stance.label}
                </span>
              </div>
              <span className="ml-3 shrink-0 text-gray-400 group-hover:text-[#1B2A4A] transition-colors">
                {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </span>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 pt-1 space-y-2">
                    <p className="text-sm font-medium text-gray-700 leading-relaxed">
                      {policy.summary}
                    </p>
                    <p className="text-sm text-gray-500 leading-relaxed">
                      {policy.details}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
