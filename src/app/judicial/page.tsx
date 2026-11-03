import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Scale, Users, Gavel, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Judicial Branch — Supreme Court",
  description:
    "Track Supreme Court cases, justice voting patterns, and financial disclosures. Understand rulings in plain English.",
};

export default async function JudicialPage() {
  let activeJustices: Awaited<ReturnType<typeof fetchJustices>> = [];
  let recentCases: Awaited<ReturnType<typeof fetchRecentCases>> = [];
  let pendingCases: Awaited<ReturnType<typeof fetchPendingCases>> = [];
  let totalGifts = 0;

  try {
    [activeJustices, recentCases, totalGifts] = await Promise.all([
      fetchJustices(),
      fetchRecentCases(),
      prisma.justiceGift.count().catch(() => 0),
    ]);
  } catch {
    // Tables may not exist yet — render page with empty data
  }

  try {
    pendingCases = await fetchPendingCases();
  } catch {
    // Table may not exist yet
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <section className="bg-[#1B2A4A] text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 text-sm text-white/60 mb-4">
            <Scale size={16} />
            Judicial Branch
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">
            Supreme Court of the United States
          </h1>
          <p className="text-white/70 max-w-2xl text-base">
            Track current and past cases, see how justices vote, and explore
            financial disclosures — including gifts, trips, and outside income.
          </p>
        </div>
      </section>

      {/* Active Justices */}
      <section className="bg-white py-12 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <Users size={20} className="text-[#1B2A4A]" />
              <h2 className="text-xl font-bold text-[#1B2A4A]">
                Current Justices
              </h2>
            </div>
            <Link
              href="/judicial/justices"
              className="text-sm font-semibold text-[#1B2A4A] hover:text-blue-700 inline-flex items-center gap-1"
            >
              View all justices <ArrowRight size={14} />
            </Link>
          </div>

          {activeJustices.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {activeJustices.map((j) => {
                const totalPerks = j._count.gifts + j._count.reimbursements;
                return (
                  <Link
                    key={j.id}
                    href={`/judicial/justices/${j.oyezIdentifier}`}
                    className="group flex items-start gap-4 p-5 rounded-xl border border-gray-200
                               hover:border-[#1B2A4A]/30 hover:shadow-lg transition-all"
                  >
                    {j.photoUrl ? (
                      <Image
                        src={j.photoUrl}
                        alt={j.name}
                        width={56}
                        height={56}
                        className="w-14 h-14 rounded-full object-cover bg-gray-200"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-[#1B2A4A]/10 flex items-center justify-center text-lg font-bold text-[#1B2A4A]">
                        {j.name.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-[#1B2A4A] group-hover:underline">
                        {j.name}
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {j.roleTitle ?? "Associate Justice"}
                        {j.appointingPresident && (
                          <> · Appointed by {j.appointingPresident}</>
                        )}
                      </p>
                      {totalPerks > 0 && (
                        <p className="text-xs text-amber-600 font-medium mt-1">
                          {totalPerks} reported gift{totalPerks !== 1 ? "s" : ""} / trip{totalPerks !== 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">
              No justice data synced yet. Run the sync-scotus cron job to import data.
            </p>
          )}
        </div>
      </section>

      {/* Pending Cases */}
      {pendingCases.length > 0 && (
        <section className="bg-gray-50 py-12 border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 mb-8">
              <Gavel size={20} className="text-[#1B2A4A]" />
              <h2 className="text-xl font-bold text-[#1B2A4A]">
                Pending Cases
              </h2>
            </div>
            <div className="space-y-4">
              {pendingCases.map((c) => (
                <Link
                  key={c.id}
                  href={`/judicial/cases/${c.oyezId}`}
                  className="block p-5 rounded-xl border border-gray-200 bg-white
                             hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-gray-400">
                      {c.docketNumber}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                      {c.status === "ARGUED" ? "Argued" : "Cert Granted"}
                    </span>
                  </div>
                  <h3 className="font-semibold text-[#1B2A4A] text-sm">
                    {c.name}
                  </h3>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Recent Decisions */}
      <section className="bg-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <Scale size={20} className="text-[#1B2A4A]" />
              <h2 className="text-xl font-bold text-[#1B2A4A]">
                Recent Decisions
              </h2>
            </div>
            <Link
              href="/judicial/cases"
              className="text-sm font-semibold text-[#1B2A4A] hover:text-blue-700 inline-flex items-center gap-1"
            >
              Browse all cases <ArrowRight size={14} />
            </Link>
          </div>
          {recentCases.length > 0 ? (
            <div className="space-y-4">
              {recentCases.map((c) => (
                <Link
                  key={c.id}
                  href={`/judicial/cases/${c.oyezId}`}
                  className="block p-5 rounded-xl border border-gray-200
                             hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-gray-400">
                      {c.docketNumber}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                      Decided{" "}
                      {c.majorityVotes && c.minorityVotes
                        ? `${c.majorityVotes}-${c.minorityVotes}`
                        : ""}
                    </span>
                    {c.dateDecided && (
                      <span className="text-xs text-gray-400">
                        {new Date(c.dateDecided).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-[#1B2A4A] text-sm mb-1">
                    {c.name}
                  </h3>
                  {(c.aiSummary ?? c.conclusion) && (
                    <p className="text-sm text-gray-500 line-clamp-2">
                      {c.aiSummary ?? c.conclusion}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">
              No cases synced yet. Run the sync-scotus cron job to import
              SCOTUS data.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

// ── Data fetchers ──

function fetchJustices() {
  return prisma.justice.findMany({
    where: { isActive: true },
    select: {
      id: true,
      oyezIdentifier: true,
      name: true,
      photoUrl: true,
      roleTitle: true,
      appointingPresident: true,
      dateStart: true,
      ideologyScore: true,
      _count: { select: { gifts: true, reimbursements: true } },
    },
    orderBy: { dateStart: "asc" },
  });
}

function fetchRecentCases() {
  return prisma.courtCase.findMany({
    where: { status: "DECIDED" },
    select: {
      id: true,
      oyezId: true,
      name: true,
      docketNumber: true,
      term: true,
      dateDecided: true,
      majorityVotes: true,
      minorityVotes: true,
      aiSummary: true,
      conclusion: true,
      status: true,
    },
    orderBy: { dateDecided: "desc" },
    take: 10,
  });
}

function fetchPendingCases() {
  return prisma.courtCase.findMany({
    where: { status: { in: ["GRANTED", "ARGUED"] } },
    select: {
      id: true,
      oyezId: true,
      name: true,
      docketNumber: true,
      term: true,
      dateArgued: true,
      status: true,
    },
    orderBy: { dateArgued: "desc" },
    take: 10,
  });
}
