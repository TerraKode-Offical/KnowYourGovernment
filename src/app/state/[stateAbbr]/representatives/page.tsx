import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight, User } from "lucide-react";
import PartyBadge from "@/components/ui/PartyBadge";
import AnimatedSection from "@/components/features/AnimatedSection";
import DistrictFinder from "@/components/features/DistrictFinder";
import { prisma } from "@/lib/db";
import { OfficeType } from "@/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ stateAbbr: string }>;
}): Promise<Metadata> {
  const { stateAbbr } = await params;
  return { title: `U.S. Representatives — ${stateAbbr.toUpperCase()}` };
}

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

export default async function RepresentativesPage({
  params,
}: {
  params: Promise<{ stateAbbr: string }>;
}) {
  const { stateAbbr } = await params;
  const abbr = stateAbbr.toUpperCase();

  const state = await prisma.state.findUnique({ where: { abbreviation: abbr } });

  const reps = state
    ? await prisma.candidate.findMany({
        where: { stateId: state.id, officeType: OfficeType.US_REPRESENTATIVE },
        include: {
          sponsoredBills: { select: { id: true } },
        },
        orderBy: [{ district: "asc" }, { name: "asc" }],
      })
    : [];

  const demCount = reps.filter((r) => r.party === "D").length;
  const repCount = reps.filter((r) => r.party === "R").length;
  const indCount = reps.filter((r) => r.party !== "D" && r.party !== "R").length;

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
            <span className="text-white/80">Representatives</span>
          </nav>
          <h1 className="text-3xl sm:text-4xl font-bold">U.S. House Representatives</h1>
          <p className="text-white/60 mt-2">
            {reps.length > 0
              ? `${abbr} has ${reps.length} representative${reps.length !== 1 ? "s" : ""} in the House of Representatives.`
              : `House representative records for ${abbr} have not been added yet.`}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* District Finder */}
        <div className="mb-10">
          <DistrictFinder />
        </div>

        {reps.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
            <User size={48} className="text-gray-300 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-[#1B2A4A] mb-2">No Representative Data Yet</h2>
            <p className="text-sm text-gray-500">
              Representative records for {abbr} have not been added to the database yet.
            </p>
          </div>
        ) : (
          <>
            {/* Party breakdown */}
            <div className="mb-8 flex items-center gap-4 flex-wrap">
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Party breakdown:</p>
              {demCount > 0 && (
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
                  <span className="text-sm text-gray-700 font-medium">Democrat: {demCount}</span>
                </div>
              )}
              {repCount > 0 && (
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
                  <span className="text-sm text-gray-700 font-medium">Republican: {repCount}</span>
                </div>
              )}
              {indCount > 0 && (
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-purple-500 inline-block" />
                  <span className="text-sm text-gray-700 font-medium">Other: {indCount}</span>
                </div>
              )}
            </div>

            {/* Representatives grid */}
            <AnimatedSection>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {reps.map((rep) => (
                  <Link
                    key={rep.id}
                    href={`/candidate/${rep.id}`}
                    className="group bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
                  >
                    {/* Photo area */}
                    <div className="relative bg-gradient-to-br from-gray-100 to-gray-200 h-32 flex items-center justify-center overflow-hidden">
                      {rep.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <Image src={rep.photoUrl} alt={rep.name} width={96} height={96} className="w-full h-full object-cover" />
                      ) : (
                        <User size={48} className="text-gray-300" />
                      )}
                      {rep.district && (
                        <div className="absolute top-3 left-3">
                          <span className="text-xs font-bold bg-white/90 text-[#1B2A4A] px-2 py-1 rounded-full shadow-sm">
                            District {rep.district}
                          </span>
                        </div>
                      )}
                      <div className="absolute top-3 right-3">
                        <PartyBadge party={rep.party} size="xs" />
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-4">
                      <h3 className="font-bold text-[#1B2A4A] group-hover:text-blue-700 transition-colors">
                        {rep.name}
                      </h3>
                      {rep.isIncumbent && (
                        <p className="text-xs text-gray-500 mt-0.5 mb-3">Incumbent</p>
                      )}

                      <div className="flex items-center justify-between text-xs mt-3">
                        <span className="text-gray-400">{rep.sponsoredBills.length} bills sponsored</span>
                        <span className="text-blue-600 font-medium group-hover:underline">
                          Profile →
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </AnimatedSection>
          </>
        )}
      </div>
    </div>
  );
}
