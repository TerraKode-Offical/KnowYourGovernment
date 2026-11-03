import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Vote, Calendar, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Upcoming Elections — All States",
  description:
    "Every upcoming federal, state, and local election scheduled across the United States.",
};

function daysUntil(d: Date): number {
  return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default async function ElectionsIndexPage() {
  let elections: Awaited<ReturnType<typeof fetchElections>> = [];
  try {
    elections = await fetchElections();
  } catch {
    // DB may not be available during build — render empty state
  }

function fetchElections() {
  return prisma.election.findMany({
    where: { date: { gte: new Date() } },
    include: { state: { select: { name: true, abbreviation: true } } },
    orderBy: { date: "asc" },
    take: 200,
  });
}

  // Group by month for readability
  const byMonth: Record<string, typeof elections> = {};
  for (const e of elections) {
    const key = e.date.toLocaleDateString("en-US", { year: "numeric", month: "long" });
    (byMonth[key] ||= []).push(e);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#1B2A4A] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <nav className="flex items-center gap-1.5 text-white/50 text-sm mb-4">
            <Link href="/" className="hover:text-white/80">Home</Link>
            <ChevronRight size={14} />
            <span className="text-white/80">Upcoming Elections</span>
          </nav>
          <h1 className="text-3xl sm:text-4xl font-bold">Upcoming Elections</h1>
          <p className="text-white/60 mt-2 max-w-2xl">
            Every federal, state, and local election currently scheduled across
            the United States. Want only your state&apos;s elections?{" "}
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
        {elections.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
            <Vote size={48} className="text-gray-300 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-[#1B2A4A] mb-2">
              No Upcoming Elections
            </h2>
            <p className="text-sm text-gray-500">
              We don&apos;t have any scheduled elections in our system right now.
              The 2026 midterm general election is on Tuesday, November 3, 2026.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(byMonth).map(([month, months]) => (
              <section key={month}>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  {month}
                </h2>
                <div className="space-y-3">
                  {months.map((e) => (
                    <div
                      key={e.id}
                      className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6"
                    >
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center">
                          <Calendar size={20} className="text-amber-600" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                            {e.electionType}
                          </div>
                          <div className="text-sm font-bold text-[#1B2A4A]">
                            {e.date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                          </div>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-[#1B2A4A] leading-snug">
                          {e.name}
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {e.state?.name ?? "Federal"} · {daysUntil(e.date)} days away
                        </p>
                      </div>
                      {e.state?.abbreviation && (
                        <Link
                          href={`/state/${e.state.abbreviation}/elections`}
                          className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700 shrink-0"
                        >
                          {e.state.abbreviation} details <ArrowRight size={12} />
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
