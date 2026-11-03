import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Building2, DollarSign, FileText } from "lucide-react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  FEDERAL_AGENCIES,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
} from "@/lib/agencies";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface AgencyPageProps {
  params: Promise<{ slug: string }>;
}

interface USASpendingAgencyDetail {
  agency_name: string;
  toptier_code: string;
  current_total_budget_authority_amount: number;
  obligated_amount: number;
  percentage_of_total_budget_authority: number;
}

interface USASpendingResponse {
  results: USASpendingAgencyDetail[];
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function formatDollars(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1e12) return `$${(amount / 1e12).toFixed(2)} trillion`;
  if (abs >= 1e9) return `$${(amount / 1e9).toFixed(2)} billion`;
  if (abs >= 1e6) return `$${(amount / 1e6).toFixed(1)} million`;
  return `$${amount.toLocaleString()}`;
}

async function fetchBudgetForAgency(
  toptierCode: string
): Promise<USASpendingAgencyDetail | null> {
  try {
    const res = await fetch(
      "https://api.usaspending.gov/api/v2/references/toptier_agencies/",
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return null;
    const data: USASpendingResponse = await res.json();
    return (
      data.results?.find((a) => a.toptier_code === toptierCode) ?? null
    );
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// Metadata
// ─────────────────────────────────────────────

export async function generateMetadata({
  params,
}: AgencyPageProps): Promise<Metadata> {
  const { slug } = await params;
  const agency = FEDERAL_AGENCIES.find(
    (a) => a.abbreviation.toLowerCase() === slug.toLowerCase()
  );
  if (!agency) return { title: "Agency Not Found" };
  return {
    title: `${agency.abbreviation} — ${agency.name}`,
    description: agency.description,
  };
}

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

export default async function AgencyDetailPage({ params }: AgencyPageProps) {
  const { slug } = await params;
  const agency = FEDERAL_AGENCIES.find(
    (a) => a.abbreviation.toLowerCase() === slug.toLowerCase()
  );
  if (!agency) notFound();

  // Fetch budget data and related bills in parallel
  const [budget, relatedBills] = await Promise.all([
    fetchBudgetForAgency(agency.toptierCode),
    prisma.bill
      .findMany({
        where: {
          OR: agency.billSearchTerms.map((term) => ({
            title: { contains: term, mode: "insensitive" as const },
          })),
        },
        select: {
          id: true,
          externalId: true,
          title: true,
          shortTitle: true,
          chamber: true,
          status: true,
          introducedDate: true,
          executiveSummary: true,
          congressGovUrl: true,
        },
        orderBy: { introducedDate: "desc" },
        take: 20,
      })
      .catch(() => []),
  ]);

  const categoryColor = CATEGORY_COLORS[agency.category];

  return (
    <div className="flex flex-col">
      {/* ── Header ── */}
      <section className="bg-[#1B2A4A] text-white py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/agencies"
            className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft size={14} /> All Agencies
          </Link>

          <div className="flex items-start gap-5">
            <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
              <span className="text-xl font-bold">{agency.abbreviation}</span>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                {agency.name}
              </h1>
              <p className="text-white/70 text-base mb-3">
                {agency.description}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${categoryColor}`}
                >
                  {CATEGORY_LABELS[agency.category]}
                </span>
                <a
                  href={agency.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-300 hover:text-blue-200"
                >
                  Official website <ExternalLink size={11} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Budget Overview ── */}
      <section className="bg-white border-b border-gray-200 py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 mb-6">
            <DollarSign size={20} className="text-[#1B2A4A]" />
            <h2 className="text-xl font-bold text-[#1B2A4A]">
              Budget &amp; Spending
            </h2>
          </div>

          {budget ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="p-5 rounded-xl border border-gray-200 bg-gray-50">
                <p className="text-sm text-gray-500 mb-1">Budget Authority</p>
                <p className="text-2xl font-bold text-[#1B2A4A]">
                  {formatDollars(budget.current_total_budget_authority_amount)}
                </p>
              </div>
              <div className="p-5 rounded-xl border border-gray-200 bg-gray-50">
                <p className="text-sm text-gray-500 mb-1">Obligated</p>
                <p className="text-2xl font-bold text-[#1B2A4A]">
                  {formatDollars(budget.obligated_amount)}
                </p>
              </div>
              <div className="p-5 rounded-xl border border-gray-200 bg-gray-50">
                <p className="text-sm text-gray-500 mb-1">
                  % of Federal Budget
                </p>
                <p className="text-2xl font-bold text-[#1B2A4A]">
                  {budget.percentage_of_total_budget_authority.toFixed(2)}%
                </p>
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-sm">
              Budget data is currently unavailable. Check{" "}
              <a
                href="https://www.usaspending.gov"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                USAspending.gov
              </a>{" "}
              for the latest figures.
            </p>
          )}

          <p className="text-xs text-gray-400 mt-4">
            Source:{" "}
            <a
              href="https://www.usaspending.gov"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              USAspending.gov
            </a>{" "}
            · Current fiscal year
          </p>
        </div>
      </section>

      {/* ── Related Bills ── */}
      <section className="bg-gray-50 py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 mb-6">
            <FileText size={20} className="text-[#1B2A4A]" />
            <h2 className="text-xl font-bold text-[#1B2A4A]">
              Related Legislation
            </h2>
          </div>

          {relatedBills.length > 0 ? (
            <div className="space-y-4">
              {relatedBills.map((bill) => (
                <div
                  key={bill.id}
                  className="p-5 rounded-xl border border-gray-200 bg-white hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-gray-400">
                          {bill.externalId}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                          {bill.chamber} · {bill.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      <h3 className="font-semibold text-[#1B2A4A] text-sm leading-snug">
                        {bill.shortTitle ?? bill.title}
                      </h3>
                      {bill.executiveSummary && (
                        <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                          {bill.executiveSummary}
                        </p>
                      )}
                    </div>
                    {bill.congressGovUrl && (
                      <a
                        href={bill.congressGovUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline whitespace-nowrap flex-shrink-0"
                      >
                        Congress.gov <ExternalLink size={10} className="inline" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-gray-400">
              <Building2 size={32} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">
                No bills currently match this agency. Bills are synced
                periodically from Congress.gov.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
