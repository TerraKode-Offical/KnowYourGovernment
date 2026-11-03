import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Scale,
  Gift,
  Plane,
  TrendingUp,
  BarChart3,
  AlertTriangle,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { sanitizeHtml } from "@/lib/sanitize";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface JusticePageProps {
  params: Promise<{ slug: string }>;
}

// ─────────────────────────────────────────────
// Metadata
// ─────────────────────────────────────────────

export async function generateMetadata({
  params,
}: JusticePageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const justice = await prisma.justice.findUnique({
      where: { oyezIdentifier: slug },
      select: { name: true, roleTitle: true },
    });
    if (!justice) return { title: "Justice Not Found" };
    return {
      title: `${justice.name} — ${justice.roleTitle ?? "Supreme Court Justice"}`,
      description: `Voting record, financial disclosures, and profile for ${justice.name}.`,
    };
  } catch {
    return { title: "Justice Not Found" };
  }
}

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

export default async function JusticeProfilePage({
  params,
}: JusticePageProps) {
  const { slug } = await params;

  let justice;
  try {
    justice = await prisma.justice.findUnique({
      where: { oyezIdentifier: slug },
      include: {
        votes: {
          include: {
            courtCase: {
              select: {
                id: true,
                oyezId: true,
                name: true,
                docketNumber: true,
                term: true,
                dateDecided: true,
                majorityVotes: true,
                minorityVotes: true,
                status: true,
              },
            },
          },
          orderBy: { courtCase: { dateDecided: "desc" } },
          take: 50,
        },
        gifts: { orderBy: { year: "desc" }, take: 50 },
        reimbursements: { orderBy: { year: "desc" }, take: 50 },
        investments: { orderBy: { year: "desc" }, take: 20 },
        financialDisclosures: { orderBy: { year: "desc" }, take: 10 },
      },
    });
  } catch {
    notFound();
  }

  if (!justice) notFound();

  // Calculate voting stats
  const totalVotes = justice.votes.length;
  const majorityVotes = justice.votes.filter(
    (v) => v.voteType === "majority"
  ).length;
  const dissentVotes = justice.votes.filter(
    (v) => v.voteType === "minority"
  ).length;
  const majorityPct =
    totalVotes > 0 ? Math.round((majorityVotes / totalVotes) * 100) : 0;

  // Calculate average ideology from individual votes
  const votesWithIdeology = justice.votes.filter(
    (v) => v.ideologyScore !== null
  );
  const avgIdeology =
    votesWithIdeology.length > 0
      ? votesWithIdeology.reduce((sum, v) => sum + (v.ideologyScore ?? 0), 0) /
        votesWithIdeology.length
      : justice.ideologyScore;

  const totalPerks = justice.gifts.length + justice.reimbursements.length;

  return (
    <div className="flex flex-col">
      {/* Header */}
      <section className="bg-[#1B2A4A] text-white py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/judicial"
            className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft size={14} /> Supreme Court
          </Link>

          <div className="flex items-start gap-6">
            {justice.photoUrl ? (
              <Image
                src={justice.photoUrl}
                alt={justice.name}
                width={96}
                height={96}
                className="w-24 h-24 rounded-xl object-cover bg-white/10"
              />
            ) : (
              <div className="w-24 h-24 rounded-xl bg-white/10 flex items-center justify-center text-3xl font-bold">
                {justice.name.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-1">
                {justice.name}
              </h1>
              <p className="text-white/70 text-base mb-3">
                {justice.roleTitle ?? "Associate Justice"}
                {justice.appointingPresident && (
                  <> · Appointed by {justice.appointingPresident}</>
                )}
              </p>
              <div className="flex flex-wrap gap-3 text-xs">
                {justice.lawSchool && (
                  <span className="bg-white/10 px-2.5 py-1 rounded-full">
                    {justice.lawSchool}
                  </span>
                )}
                {justice.dateStart && (
                  <span className="bg-white/10 px-2.5 py-1 rounded-full">
                    Serving since{" "}
                    {new Date(justice.dateStart).getFullYear()}
                  </span>
                )}
                {totalPerks > 0 && (
                  <span className="bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-full font-medium">
                    {totalPerks} gift/trip disclosure
                    {totalPerks !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Voting Stats */}
      <section className="bg-white border-b border-gray-200 py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 size={20} className="text-[#1B2A4A]" />
            <h2 className="text-xl font-bold text-[#1B2A4A]">
              Voting Record
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 mb-8">
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-500">Total Votes</p>
              <p className="text-2xl font-bold text-[#1B2A4A]">{totalVotes}</p>
            </div>
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-500">In Majority</p>
              <p className="text-2xl font-bold text-green-700">
                {majorityPct}%
              </p>
            </div>
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-500">Dissents</p>
              <p className="text-2xl font-bold text-red-700">{dissentVotes}</p>
            </div>
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-500">Ideology</p>
              <p className="text-2xl font-bold text-[#1B2A4A]">
                {avgIdeology !== null && avgIdeology !== undefined
                  ? avgIdeology > 0
                    ? `+${avgIdeology.toFixed(1)} Con`
                    : `${avgIdeology.toFixed(1)} Lib`
                  : "N/A"}
              </p>
            </div>
          </div>

          {/* Vote history */}
          {justice.votes.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                Recent Votes
              </h3>
              {justice.votes.slice(0, 20).map((v) => (
                <Link
                  key={v.id}
                  href={`/judicial/cases/${v.courtCase.oyezId}`}
                  className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:shadow-sm transition-shadow"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#1B2A4A] truncate">
                      {v.courtCase.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {v.courtCase.docketNumber} · {v.courtCase.term} Term
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                    {v.courtCase.majorityVotes && v.courtCase.minorityVotes && (
                      <span className="text-xs text-gray-400">
                        {v.courtCase.majorityVotes}-
                        {v.courtCase.minorityVotes}
                      </span>
                    )}
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        v.voteType === "majority"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {v.voteType === "majority" ? "Majority" : "Dissent"}
                    </span>
                    {v.opinionType &&
                      v.opinionType !== "none" &&
                      v.opinionType !== v.voteType && (
                        <span className="text-xs text-gray-400 capitalize">
                          ({v.opinionType})
                        </span>
                      )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Financial Disclosures — Gifts & Trips */}
      <section className="bg-gray-50 py-10 border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={20} className="text-amber-600" />
            <h2 className="text-xl font-bold text-[#1B2A4A]">
              Financial Disclosures
            </h2>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            Gifts, paid travel, and outside income reported by this justice.
            Data sourced from{" "}
            <a
              href="https://www.courtlistener.com/financial-disclosures/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              CourtListener
            </a>{" "}
            (Free Law Project).
          </p>

          {/* Gifts */}
          {justice.gifts.length > 0 && (
            <div className="mb-8">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-600 uppercase tracking-wider mb-4">
                <Gift size={14} /> Reported Gifts ({justice.gifts.length})
              </h3>
              <div className="space-y-3">
                {justice.gifts.map((g) => (
                  <div
                    key={g.id}
                    className="p-4 rounded-lg border border-gray-200 bg-white"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-[#1B2A4A]">
                          {g.description}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          From: <span className="font-medium">{g.source}</span>
                          {g.year && <> · {g.year}</>}
                        </p>
                      </div>
                      {g.value && (
                        <span className="text-sm font-bold text-amber-700 whitespace-nowrap">
                          {g.value}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reimbursements / Trips */}
          {justice.reimbursements.length > 0 && (
            <div className="mb-8">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-600 uppercase tracking-wider mb-4">
                <Plane size={14} /> Paid Travel & Trips (
                {justice.reimbursements.length})
              </h3>
              <div className="space-y-3">
                {justice.reimbursements.map((r) => (
                  <div
                    key={r.id}
                    className="p-4 rounded-lg border border-gray-200 bg-white"
                  >
                    <p className="text-sm font-semibold text-[#1B2A4A]">
                      {r.itemsPaid ?? "Travel, meals and lodging"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      From: <span className="font-medium">{r.source}</span>
                      {r.location && <> · {r.location}</>}
                      {r.purpose && <> · {r.purpose}</>}
                      {r.year && <> · {r.year}</>}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Investments */}
          {justice.investments.length > 0 && (
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-600 uppercase tracking-wider mb-4">
                <TrendingUp size={14} /> Investments ({justice.investments.length}
                )
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {justice.investments.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-3 rounded-lg border border-gray-200 bg-white text-sm"
                  >
                    <p className="font-medium text-[#1B2A4A] truncate">
                      {inv.description}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {inv.valueCode && <>Value: {inv.valueCode}</>}
                      {inv.year && <> · {inv.year}</>}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {totalPerks === 0 && justice.investments.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-8">
              No financial disclosure data synced yet. Run the sync-scotus cron
              job to import data from CourtListener.
            </p>
          )}

          {/* Disclosure PDFs */}
          {justice.financialDisclosures.length > 0 && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-500 mb-3">
                Original Disclosure Forms
              </h3>
              <div className="flex flex-wrap gap-2">
                {justice.financialDisclosures.map((fd) => (
                  <a
                    key={fd.id}
                    href={fd.pdfUrl ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-3 py-1.5 rounded-full border border-gray-200
                               hover:bg-gray-100 text-[#1B2A4A] font-medium transition-colors"
                  >
                    {fd.year}
                    {fd.isAmended && " (amended)"}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Biography */}
      {justice.biography && (
        <section className="bg-white py-10">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-xl font-bold text-[#1B2A4A] mb-4">
              Biography
            </h2>
            <div
              className="prose prose-sm prose-gray max-w-none"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(justice.biography) }}
            />
          </div>
        </section>
      )}
    </div>
  );
}
