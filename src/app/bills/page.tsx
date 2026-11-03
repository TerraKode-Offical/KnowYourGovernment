import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, ArrowRight } from "lucide-react";
import BillStatusBadge from "@/components/ui/BillStatusBadge";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Federal Bills — Congress in Plain English",
  description:
    "Track federal legislation in Congress. AI summaries explain what bills do and flag hidden riders.",
};

const PAGE_SIZE = 25;

export default async function BillsIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageStr } = await searchParams;
  const currentPage = Math.max(1, parseInt(pageStr ?? "1", 10));

  const [bills, totalCount] = await Promise.all([
    prisma.bill.findMany({
      include: {
        sponsor: {
          select: {
            name: true,
            party: true,
            district: true,
            state: { select: { abbreviation: true } },
          },
        },
      },
      orderBy: { lastActionDate: { sort: "desc", nulls: "last" } },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.bill.count(),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#1B2A4A] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <nav className="flex items-center gap-1.5 text-white/50 text-sm mb-4">
            <Link href="/" className="hover:text-white/80">Home</Link>
            <ChevronRight size={14} />
            <span className="text-white/80">Federal Bills</span>
          </nav>
          <h1 className="text-3xl sm:text-4xl font-bold">Federal Bills</h1>
          <p className="text-white/60 mt-2 max-w-2xl">
            Every bill currently moving through the U.S. Congress. Want to see
            only bills introduced by your state&apos;s delegation?{" "}
            <Link
              href="/#select-state"
              className="underline decoration-2 underline-offset-2 hover:text-white"
            >
              Pick your state
            </Link>
            .
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-sm text-gray-500 mb-4">
          Showing {Math.min((currentPage - 1) * PAGE_SIZE + 1, totalCount)}–
          {Math.min(currentPage * PAGE_SIZE, totalCount)} of {totalCount} bills
        </p>
        <div className="space-y-3">
          {bills.map((b) => {
            const sponsorLabel = b.sponsor
              ? `${b.sponsor.name} (${b.sponsor.party}-${b.sponsor.state?.abbreviation ?? ""}${b.sponsor.district ? `-${b.sponsor.district}` : ""})`
              : "Unknown sponsor";
            const stateAbbr = b.sponsor?.state?.abbreviation ?? "US";
            return (
              <Link
                key={b.id}
                href={`/state/${stateAbbr}/bills/${b.id}`}
                className="group block bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-[#1B2A4A]/20 transition-all p-4 sm:p-5"
              >
                <div className="flex items-start gap-3 flex-wrap">
                  <span className="text-xs font-mono font-bold bg-[#1B2A4A]/8 text-[#1B2A4A] px-2 py-1 rounded-md shrink-0">
                    {b.externalId}
                  </span>
                  <BillStatusBadge status={b.status} size="xs" />
                </div>
                <h3 className="mt-2 font-semibold text-[#1B2A4A] text-base leading-snug group-hover:text-blue-700">
                  {b.title}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Sponsored by {sponsorLabel} ·{" "}
                  {b.chamber === "HOUSE" ? "House" : "Senate"}
                  {b.lastActionDate
                    ? ` · Last action ${b.lastActionDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                    : ""}
                </p>
              </Link>
            );
          })}
        </div>

        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            {currentPage > 1 && (
              <Link
                href={`/bills?page=${currentPage - 1}`}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                Previous
              </Link>
            )}
            <span className="px-3 py-1.5 text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            {currentPage < totalPages && (
              <Link
                href={`/bills?page=${currentPage + 1}`}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                Next
              </Link>
            )}
          </div>
        )}

        <div className="mt-10 p-5 bg-white rounded-xl border border-gray-200 flex items-start gap-3">
          <div className="flex-1">
            <p className="font-semibold text-[#1B2A4A]">
              See bills from your state&apos;s delegation
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Pick your state from the map on the homepage to filter to bills
              introduced by senators and representatives who represent you.
            </p>
          </div>
          <Link
            href="/#select-state"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 whitespace-nowrap"
          >
            Pick state <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
