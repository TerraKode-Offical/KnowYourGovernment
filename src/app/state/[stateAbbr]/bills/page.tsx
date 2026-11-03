import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, AlertTriangle } from "lucide-react";
import BillStatusBadge from "@/components/ui/BillStatusBadge";
import AnimatedSection from "@/components/features/AnimatedSection";
import BillsFilterBar from "@/components/features/BillsFilterBar";
import { prisma } from "@/lib/db";
import { BillStatus, Chamber } from "@/types";
import type { Prisma } from "@prisma/client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ stateAbbr: string }>;
}): Promise<Metadata> {
  const { stateAbbr } = await params;
  return { title: `Bills & Legislation — ${stateAbbr.toUpperCase()}` };
}

const PAGE_SIZE = 10;

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

export default async function BillsPage({
  params,
  searchParams,
}: {
  params: Promise<{ stateAbbr: string }>;
  searchParams: Promise<{ chamber?: string; status?: string; page?: string; q?: string }>;
}) {
  const { stateAbbr } = await params;
  const { chamber, status, page: pageStr, q } = await searchParams;
  const abbr = stateAbbr.toUpperCase();
  const currentPage = Math.max(1, parseInt(pageStr ?? "1", 10));

  const state = await prisma.state.findUnique({ where: { abbreviation: abbr } });

  // Build where clause. Federal bills are not state-scoped at the Bill level;
  // we consider a bill relevant to a state if its sponsor belongs to that
  // state's delegation. State-level legislation still carries Bill.stateId.
  const where: Prisma.BillWhereInput = state
    ? { OR: [{ sponsor: { stateId: state.id } }, { stateId: state.id }] }
    : {};

  if (chamber && (chamber === "HOUSE" || chamber === "SENATE")) {
    where.chamber = chamber as Chamber;
  }
  if (status && Object.values(BillStatus).includes(status as BillStatus)) {
    where.status = status as BillStatus;
  }
  if (q) {
    where.title = { contains: q, mode: "insensitive" };
  }

  const [bills, totalCount] = await Promise.all([
    prisma.bill.findMany({
      where,
      include: {
        sponsor: { select: { id: true, name: true, party: true, district: true, state: { select: { abbreviation: true } } } },
      },
      orderBy: { lastActionDate: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.bill.count({ where }),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  function buildPageUrl(p: number) {
    const sp = new URLSearchParams();
    if (chamber) sp.set("chamber", chamber);
    if (status) sp.set("status", status);
    if (q) sp.set("q", q);
    sp.set("page", String(p));
    return `/state/${abbr}/bills?${sp.toString()}`;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#1B2A4A] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <nav className="flex items-center gap-1.5 text-white/50 text-sm mb-4">
            <Link href="/" className="hover:text-white/80">Home</Link>
            <ChevronRight size={14} />
            <Link href={`/state/${abbr}`} className="hover:text-white/80">{abbr}</Link>
            <ChevronRight size={14} />
            <span className="text-white/80">Bills</span>
          </nav>
          <h1 className="text-3xl sm:text-4xl font-bold">Bills &amp; Legislation</h1>
          <p className="text-white/60 mt-2">
            Track federal and state bills. AI summaries highlight hidden riders and key provisions.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter bar */}
        <BillsFilterBar />

        {/* Bills list */}
        <AnimatedSection>
          <div className="mt-6 space-y-4">
            {bills.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
                <p className="text-gray-500 font-medium">No bills found matching your filters.</p>
              </div>
            ) : (
              bills.map((bill) => {
                const subjects = (bill.subjects as string[]) ?? [];
                const hiddenClauses = (bill.hiddenClauses as unknown[]) ?? [];
                const hasRider = hiddenClauses.length > 0;

                const sponsorLabel = bill.sponsor
                  ? `${bill.sponsor.name}${bill.sponsor.district ? ` (${bill.sponsor.party}-${bill.sponsor.state?.abbreviation ?? ""}-${bill.sponsor.district})` : ` (${bill.sponsor.party}-${bill.sponsor.state?.abbreviation ?? ""})`}`
                  : "Unknown sponsor";

                return (
                  <Link
                    key={bill.id}
                    href={`/state/${abbr}/bills/${bill.id}`}
                    className="group block bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-[#1B2A4A]/20 transition-all duration-200 overflow-hidden"
                  >
                    <div className="p-5 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                        {/* Bill number + status */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-mono font-bold bg-[#1B2A4A]/8 text-[#1B2A4A] px-2.5 py-1 rounded-md">
                            {bill.externalId}
                          </span>
                          <BillStatusBadge status={bill.status} size="xs" />
                        </div>

                        {/* Rider badge */}
                        {hasRider && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full ring-1 ring-amber-200">
                            <AlertTriangle size={10} />
                            RIDER ALERT
                          </span>
                        )}
                      </div>

                      <div className="mt-3">
                        <h3 className="font-bold text-[#1B2A4A] text-base sm:text-lg group-hover:text-blue-700 transition-colors leading-snug">
                          {bill.title}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1 mb-3">
                          Sponsored by {sponsorLabel} ·{" "}
                          {bill.chamber === "HOUSE" ? "House" : "Senate"} ·{" "}
                          {bill.lastActionDate
                            ? `Last action: ${bill.lastActionDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                            : `Introduced: ${bill.introducedDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
                        </p>

                        {bill.executiveSummary && (
                          <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
                            {bill.executiveSummary}
                          </p>
                        )}

                        <div className="mt-4 flex flex-wrap items-center gap-2 justify-between">
                          <div className="flex flex-wrap gap-1.5">
                            {subjects.slice(0, 5).map((s) => (
                              <span key={s} className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                {s}
                              </span>
                            ))}
                          </div>
                          <span className="text-sm font-semibold text-blue-600 group-hover:underline shrink-0">
                            Read More →
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </AnimatedSection>

        {/* Pagination */}
        <div className="mt-8 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {Math.min((currentPage - 1) * PAGE_SIZE + 1, totalCount)}–
            {Math.min(currentPage * PAGE_SIZE, totalCount)} of {totalCount} bills
          </p>
          <div className="flex items-center gap-2">
            {currentPage > 1 ? (
              <Link
                href={buildPageUrl(currentPage - 1)}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                Previous
              </Link>
            ) : (
              <button
                disabled
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 text-gray-400 cursor-not-allowed"
              >
                Previous
              </button>
            )}
            {Array.from({ length: Math.min(totalPages, 5) }, (_, idx) => {
              const p = idx + 1;
              return (
                <Link
                  key={p}
                  href={buildPageUrl(p)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                    p === currentPage
                      ? "bg-[#1B2A4A] text-white border-[#1B2A4A]"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {p}
                </Link>
              );
            })}
            {currentPage < totalPages ? (
              <Link
                href={buildPageUrl(currentPage + 1)}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                Next
              </Link>
            ) : (
              <button
                disabled
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 text-gray-400 cursor-not-allowed"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
