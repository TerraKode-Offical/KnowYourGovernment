import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, ExternalLink, AlertCircle } from "lucide-react";
import PacRecipientsTable from "@/components/features/PacRecipientsTable";
import { getPacBySlug, PAC_CATALOG, PAC_CATEGORY_LABELS } from "@/lib/pac-catalog";

export async function generateStaticParams() {
  return PAC_CATALOG.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const pac = getPacBySlug(slug);
  if (!pac) return { title: "PAC Report" };
  return {
    title: `${pac.shortName} — Political Contributions to Congress`,
    description: pac.tagline,
  };
}

export default async function PacReportPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const pac = getPacBySlug(slug);
  if (!pac) notFound();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#1B2A4A] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <nav className="flex items-center gap-1.5 text-white/50 text-sm mb-4">
            <Link href="/" className="hover:text-white/80">Home</Link>
            <ChevronRight size={14} />
            <Link href="/pac-recipients" className="hover:text-white/80">
              PAC Tracker
            </Link>
            <ChevronRight size={14} />
            <span className="text-white/80">{pac.shortName}</span>
          </nav>

          <div className="flex flex-wrap items-baseline gap-3 mb-3">
            <h1 className="text-3xl sm:text-4xl font-bold">{pac.shortName}</h1>
            <span className="text-xs font-semibold uppercase tracking-wider bg-white/15 text-white px-2.5 py-1 rounded-full">
              {pac.kind === "super"
                ? "Super PAC"
                : pac.kind === "hybrid"
                  ? "Traditional + Super PAC"
                  : "Traditional PAC"}
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider bg-white/10 text-white/80 px-2.5 py-1 rounded-full">
              {PAC_CATEGORY_LABELS[pac.category]}
            </span>
          </div>

          <p className="text-white/70 text-base leading-relaxed max-w-3xl mb-2">
            {pac.name}
          </p>
          <p className="text-white/80 leading-relaxed max-w-3xl">
            {pac.description}
          </p>

          <div className="mt-5 flex flex-wrap gap-3 text-xs">
            {pac.officialUrl && (
              <a
                href={pac.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/15 text-white px-3 py-1.5 rounded-full ring-1 ring-white/20"
              >
                Official site <ExternalLink size={11} />
              </a>
            )}
            {pac.fecCommitteeIds.map((id) => (
              <a
                key={id}
                href={`https://www.fec.gov/data/committee/${id}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/15 text-white px-3 py-1.5 rounded-full ring-1 ring-white/20 font-mono"
              >
                FEC {id} <ExternalLink size={11} />
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <strong>Data freshness:</strong> Contribution records are pulled
            weekly from FEC public filings. Newly-reported contributions may
            take up to a week to appear. If this page shows no data, the sync
            hasn&apos;t reached this PAC yet — check back in a few days.
          </div>
        </div>
        <PacRecipientsTable committeeIds={pac.fecCommitteeIds} />
      </div>
    </div>
  );
}
