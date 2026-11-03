import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight, User, ExternalLink, TrendingUp } from "lucide-react";
import PartyBadge from "@/components/ui/PartyBadge";
import PolicyAccordion from "@/components/features/PolicyAccordion";
import AnimatedSection from "@/components/features/AnimatedSection";
import type { PolicyItem } from "@/components/features/PolicyAccordion";
import { prisma } from "@/lib/db";
import { OfficeType } from "@/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ stateAbbr: string }>;
}): Promise<Metadata> {
  const { stateAbbr } = await params;
  return { title: `U.S. Senators — ${stateAbbr.toUpperCase()}` };
}

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

export default async function SenatorsPage({
  params,
}: {
  params: Promise<{ stateAbbr: string }>;
}) {
  const { stateAbbr } = await params;
  const abbr = stateAbbr.toUpperCase();

  const state = await prisma.state.findUnique({ where: { abbreviation: abbr } });

  // Each state has exactly 2 US senators — limit to 2 as a safety guard
  // against duplicate records, and deduplicate by bioguideId
  const rawSenators = state
    ? await prisma.candidate.findMany({
        where: { stateId: state.id, officeType: OfficeType.US_SENATOR },
        include: {
          policies: true,
          sponsoredBills: { select: { id: true } },
          billVotes: {
            include: { bill: { select: { title: true, externalId: true } } },
            orderBy: { voteDate: "desc" },
            take: 5,
          },
        },
        orderBy: { name: "asc" },
      })
    : [];

  // Deduplicate by bioguideId (prefer most recently updated record)
  const seenBioguideIds = new Set<string>();
  const senators = rawSenators.filter((s) => {
    const info = s.contactInfo as Record<string, unknown> | null;
    const bioguideId = info?.bioguideId as string | undefined;
    if (bioguideId) {
      if (seenBioguideIds.has(bioguideId)) return false;
      seenBioguideIds.add(bioguideId);
    }
    return true;
  }).slice(0, 2);

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
            <span className="text-white/80">Senators</span>
          </nav>
          <h1 className="text-3xl sm:text-4xl font-bold">U.S. Senators</h1>
          <p className="text-white/60 mt-2">
            {abbr} is represented by two senators in the United States Senate.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {senators.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
            <User size={48} className="text-gray-300 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-[#1B2A4A] mb-2">No Senator Data Yet</h2>
            <p className="text-sm text-gray-500">
              Senator records for {abbr} have not been added to the database yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {senators.map((senator, i) => {
              const contactInfo = senator.contactInfo as Record<string, string> | null ?? {};
              const policies: PolicyItem[] = senator.policies.map((p) => ({
                category: p.category,
                summary: p.summary,
                details: p.supportersPerspective ?? p.aiAnalysis ?? "",
                stance: "supports" as const,
              }));
              const votingRecord = senator.billVotes.map((bv) => ({
                bill: bv.bill.title,
                vote: bv.vote,
                date: bv.voteDate.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
              }));

              return (
                <AnimatedSection key={senator.id} delay={i * 0.1}>
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    {/* Senator header */}
                    <div className="p-6 border-b border-gray-100">
                      <div className="flex items-start gap-4">
                        {/* Photo */}
                        <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shrink-0 ring-2 ring-gray-100 overflow-hidden">
                          {senator.photoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <Image src={senator.photoUrl} alt={senator.name} width={96} height={96} className="w-full h-full object-cover" />
                          ) : (
                            <User size={36} className="text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div>
                              <div className="flex items-center gap-3 flex-wrap">
                                <h2 className="text-xl font-bold text-[#1B2A4A]">{senator.name}</h2>
                                <Link
                                  href={`/candidate/${senator.id}`}
                                  className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                                >
                                  View Full Profile →
                                </Link>
                              </div>
                              <p className="text-sm text-gray-500 mt-0.5">U.S. Senator</p>
                            </div>
                            <PartyBadge party={senator.party} showFullName size="md" />
                          </div>
                          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                            {senator.incumbentSince && (
                              <span>Since: {senator.incumbentSince.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
                            )}
                            {senator.termEnds && (
                              <span>Term ends: {senator.termEnds.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
                            )}
                            {senator.district && <span>District: {senator.district}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Stats row */}
                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                          <div className="text-lg font-bold text-[#1B2A4A]">{senator.sponsoredBills.length}</div>
                          <div className="text-[11px] text-gray-500 mt-0.5">Bills sponsored</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                          <div className="text-lg font-bold text-[#1B2A4A]">{policies.length}</div>
                          <div className="text-[11px] text-gray-500 mt-0.5">Policy positions</div>
                        </div>
                      </div>
                    </div>

                    {/* Policy positions */}
                    {policies.length > 0 && (
                      <div className="p-6 border-b border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                          <TrendingUp size={14} />
                          Policy Positions
                        </h3>
                        <PolicyAccordion policies={policies} />
                      </div>
                    )}

                    {/* Voting record */}
                    {votingRecord.length > 0 && (
                      <div className="p-6 border-b border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                          Recent Votes
                        </h3>
                        <div className="space-y-2">
                          {votingRecord.map((vote) => (
                            <div
                              key={`${vote.bill}-${vote.date}`}
                              className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                            >
                              <span className="text-sm text-gray-700 flex-1 pr-4">{vote.bill}</span>
                              <div className="flex items-center gap-3 shrink-0">
                                <span className="text-xs text-gray-400">{vote.date}</span>
                                <span
                                  className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                                    vote.vote === "YES"
                                      ? "bg-green-100 text-green-800"
                                      : vote.vote === "NO"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-gray-100 text-gray-600"
                                  }`}
                                >
                                  {vote.vote}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="px-6 py-4 bg-gray-50">
                      {senator.websiteUrl ? (
                        <a
                          href={senator.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm text-[#1B2A4A] font-medium hover:underline"
                        >
                          Official Website <ExternalLink size={12} />
                        </a>
                      ) : contactInfo.website ? (
                        <a
                          href={contactInfo.website as string}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm text-[#1B2A4A] font-medium hover:underline"
                        >
                          Official Website <ExternalLink size={12} />
                        </a>
                      ) : null}
                    </div>
                  </div>
                </AnimatedSection>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
