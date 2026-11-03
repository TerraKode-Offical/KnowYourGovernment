import type { Metadata } from "next";
import Link from "next/link";
import { DollarSign, ArrowRight, ChevronRight } from "lucide-react";
import { PAC_CATALOG, PAC_CATEGORY_LABELS } from "@/lib/pac-catalog";

export const metadata: Metadata = {
  title: "PAC Tracker — Political Action Committee Contributions",
  description:
    "Track political action committee (PAC) and Super PAC contributions to members of Congress using FEC public filings.",
};

export default function PacRecipientsIndexPage() {
  // Group by category
  const byCategory: Record<string, typeof PAC_CATALOG> = {};
  for (const pac of PAC_CATALOG) {
    (byCategory[pac.category] ||= []).push(pac);
  }
  // Order categories by how many PACs are in each, descending
  const orderedCategories = (Object.keys(byCategory) as (keyof typeof PAC_CATEGORY_LABELS)[])
    .sort((a, b) => byCategory[b].length - byCategory[a].length);

  const notableCount = PAC_CATALOG.filter((p) => p.notable).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#1B2A4A] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <nav className="flex items-center gap-1.5 text-white/50 text-sm mb-4">
            <Link href="/" className="hover:text-white/80">Home</Link>
            <ChevronRight size={14} />
            <span className="text-white/80">PAC Tracker</span>
          </nav>

          <h1 className="text-3xl sm:text-4xl font-bold mb-3">PAC Tracker</h1>
          <p className="text-white/70 max-w-3xl leading-relaxed">
            {PAC_CATALOG.length} PACs and Super PACs tracked across {orderedCategories.length} issue areas —
            including {notableCount} that play an outsized or controversial role in
            recent elections. All data from Federal Election Commission public filings.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {orderedCategories.map((category) => (
          <section key={category} className="mb-10">
            <h2 className="text-xl font-bold text-[#1B2A4A] mb-4">
              {PAC_CATEGORY_LABELS[category]}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {byCategory[category].map((pac) => (
                <Link
                  key={pac.slug}
                  href={`/pac-recipients/${pac.slug}`}
                  className="group flex flex-col gap-3 p-5 bg-white rounded-xl border border-gray-200 hover:border-[#1B2A4A]/30 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-10 h-10 rounded-lg bg-[#1B2A4A]/10 flex items-center justify-center shrink-0">
                      <DollarSign size={20} className="text-[#1B2A4A]" />
                    </div>
                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      pac.kind === "super"
                        ? "bg-purple-50 text-purple-700"
                        : pac.kind === "hybrid"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-blue-50 text-blue-700"
                    }`}>
                      {pac.kind === "super" ? "Super PAC" : pac.kind === "hybrid" ? "PAC + Super" : "Traditional"}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-[#1B2A4A] group-hover:underline leading-tight">
                    {pac.shortName}
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed flex-1">
                    {pac.tagline}
                  </p>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-[#1B2A4A]/70 group-hover:gap-2 transition-all">
                    View recipients <ArrowRight size={12} />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}

        {/* How PACs work */}
        <div className="mt-8 p-6 bg-white rounded-xl border border-gray-200">
          <h2 className="text-lg font-bold text-[#1B2A4A] mb-3">How PAC Contributions Work</h2>
          <div className="prose prose-sm text-gray-600 max-w-none">
            <p>
              A <strong>Political Action Committee (PAC)</strong> is an
              organization that raises money to support or oppose candidates for
              office. PACs are required to register with the Federal Election
              Commission and disclose all contributions.
            </p>
            <p>
              <strong>Traditional PACs</strong> can contribute directly to
              candidates (up to $5,000 per candidate per election).{" "}
              <strong>Super PACs</strong> can raise and spend unlimited amounts
              but cannot contribute directly to candidates or coordinate with
              their campaigns. Many organizations operate both a traditional PAC
              and an affiliated Super PAC — we group them together on each page.
            </p>
            <p>
              All data comes from{" "}
              <a href="https://www.fec.gov" target="_blank" rel="noopener noreferrer">
                FEC public filings
              </a>
              . Contributions are a matter of public record.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
