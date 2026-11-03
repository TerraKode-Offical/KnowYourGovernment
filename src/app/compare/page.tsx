import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Info } from "lucide-react";
import CompareTable from "@/components/features/CompareTable";

export const metadata: Metadata = {
  title: "Compare Candidates",
  description: "Side-by-side comparison of candidates on key policy issues.",
};

export default function ComparePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#1B2A4A] text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <nav className="flex items-center gap-1.5 text-white/50 text-sm mb-4">
            <Link href="/" className="hover:text-white/80">Home</Link>
            <ChevronRight size={14} />
            <span className="text-white/80">Compare Candidates</span>
          </nav>
          <h1 className="text-3xl sm:text-4xl font-bold">Compare Candidates</h1>
          <p className="text-white/60 mt-2">
            See candidates side-by-side on the issues that matter to you.
          </p>
        </div>
      </div>

      {/* AI Disclaimer */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="flex items-start gap-2.5 p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
          <Info size={15} className="text-blue-500 shrink-0 mt-0.5" />
          <p>
            <strong>Nonpartisan comparison:</strong> Policy positions are sourced from official candidate statements, voting records, and public interviews.
            Position summaries are AI-assisted and reviewed for accuracy. InformedVoter does not endorse any candidate.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <CompareTable />
      </div>
    </div>
  );
}
