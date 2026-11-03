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
  return { title: `Governor — ${stateAbbr.toUpperCase()}` };
}

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

export default async function GovernorPage({
  params,
}: {
  params: Promise<{ stateAbbr: string }>;
}) {
  const { stateAbbr } = await params;
  const abbr = stateAbbr.toUpperCase();

  const state = await prisma.state.findUnique({ where: { abbreviation: abbr } });

  const governor = state
    ? await prisma.candidate.findFirst({
        where: { stateId: state.id, officeType: OfficeType.GOVERNOR },
        include: {
          policies: true,
          sponsoredBills: { select: { id: true } },
          billVotes: {
            include: { bill: { select: { title: true } } },
            orderBy: { voteDate: "desc" },
            take: 5,
          },
        },
      })
    : null;

  const policies: PolicyItem[] = governor
    ? governor.policies.map((p) => ({
        category: p.category,
        summary: p.summary,
        details: p.supportersPerspective ?? p.aiAnalysis ?? "",
        stance: "supports" as const,
      }))
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#1B2A4A] text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <nav className="flex items-center gap-1.5 text-white/50 text-sm mb-4">
            <Link href="/" className="hover:text-white/80">Home</Link>
            <ChevronRight size={14} />
            <Link href={`/state/${abbr}`} className="hover:text-white/80">{abbr}</Link>
            <ChevronRight size={14} />
            <span className="text-white/80">Governor</span>
          </nav>
          <h1 className="text-3xl sm:text-4xl font-bold">Office of the Governor</h1>
          <p className="text-white/60 mt-2">
            The governor serves as the chief executive of {abbr}.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <AnimatedSection>
          {!governor ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
              <User size={48} className="text-gray-300 mx-auto mb-4" />
              <h2 className="text-lg font-bold text-[#1B2A4A] mb-2">No Governor Data Yet</h2>
              <p className="text-sm text-gray-500">
                Governor record for {abbr} has not been added to the database yet.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Profile card */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 sm:p-8">
                  <div className="flex flex-col sm:flex-row gap-6">
                    {/* Photo */}
                    <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center ring-2 ring-gray-100 shrink-0 mx-auto sm:mx-0 overflow-hidden">
                      {governor.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <Image src={governor.photoUrl} alt={governor.name} width={96} height={96} className="w-full h-full object-cover" />
                      ) : (
                        <User size={56} className="text-gray-300" />
                      )}
                    </div>

                    <div className="flex-1 text-center sm:text-left">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2 justify-center sm:justify-start flex-wrap">
                        <h2 className="text-2xl font-bold text-[#1B2A4A]">{governor.name}</h2>
                        <Link
                          href={`/candidate/${governor.id}`}
                          className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          View Full Profile →
                        </Link>
                        <PartyBadge party={governor.party} showFullName size="md" />
                      </div>

                      {(governor.incumbentSince || governor.termEnds) && (
                        <p className="text-sm text-gray-500 mb-4">
                          {governor.incumbentSince && (
                            <>Since: {governor.incumbentSince.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</>
                          )}
                          {governor.incumbentSince && governor.termEnds && " – "}
                          {governor.termEnds && (
                            <>Term ends: {governor.termEnds.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</>
                          )}
                        </p>
                      )}

                      {governor.biography && (
                        <p className="text-sm text-gray-600 leading-relaxed max-w-2xl">
                          {governor.biography}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick stats */}
                <div className="border-t border-gray-100 px-6 sm:px-8 py-4 bg-gray-50 flex flex-wrap items-center gap-4">
                  {governor.isIncumbent && (
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                      <span className="text-xs text-gray-600">Currently in office</span>
                    </div>
                  )}
                  {governor.websiteUrl && (
                    <a
                      href={governor.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-[#1B2A4A] font-medium hover:underline"
                    >
                      Official Website <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              </div>

              {/* Policy positions */}
              {policies.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
                  <h2 className="text-lg font-bold text-[#1B2A4A] mb-2 flex items-center gap-2">
                    <TrendingUp size={18} />
                    Policy Positions
                  </h2>
                  <p className="text-sm text-gray-500 mb-6">
                    Based on public statements, signed legislation, and official actions.
                  </p>
                  <PolicyAccordion policies={policies} />
                </div>
              )}
            </div>
          )}
        </AnimatedSection>
      </div>
    </div>
  );
}
