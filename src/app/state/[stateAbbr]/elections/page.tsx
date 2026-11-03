import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Calendar, Vote, Clock, CheckCircle2, MapPin } from "lucide-react";
import AnimatedSection from "@/components/features/AnimatedSection";
import { prisma } from "@/lib/db";
import { ElectionType } from "@/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ stateAbbr: string }>;
}): Promise<Metadata> {
  const { stateAbbr } = await params;
  return { title: `Upcoming Elections — ${stateAbbr.toUpperCase()}` };
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function electionTypeLabel(type: ElectionType): string {
  switch (type) {
    case ElectionType.PRIMARY:  return "Primary Election";
    case ElectionType.GENERAL:  return "General Election";
    case ElectionType.SPECIAL:  return "Special Election";
    case ElectionType.RUNOFF:   return "Runoff Election";
    default:                    return String(type);
  }
}

function electionTypeColor(type: ElectionType): string {
  switch (type) {
    case ElectionType.PRIMARY:  return "bg-blue-100 text-blue-800";
    case ElectionType.GENERAL:  return "bg-emerald-100 text-emerald-800";
    case ElectionType.SPECIAL:  return "bg-amber-100 text-amber-800";
    case ElectionType.RUNOFF:   return "bg-purple-100 text-purple-800";
    default:                    return "bg-gray-100 text-gray-800";
  }
}

function daysUntil(date: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

export default async function ElectionsPage({
  params,
}: {
  params: Promise<{ stateAbbr: string }>;
}) {
  const { stateAbbr } = await params;
  const abbr = stateAbbr.toUpperCase();

  const state = await prisma.state.findUnique({ where: { abbreviation: abbr } });

  const elections = state
    ? await prisma.election.findMany({
        where: {
          stateId: state.id,
          date: { gte: new Date() },
        },
        orderBy: { date: "asc" },
      })
    : [];

  // Past elections as well for the calendar view
  const pastElections = state
    ? await prisma.election.findMany({
        where: {
          stateId: state.id,
          date: { lt: new Date() },
        },
        orderBy: { date: "desc" },
        take: 3,
      })
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
            <span className="text-white/80">Elections</span>
          </nav>
          <h1 className="text-3xl sm:text-4xl font-bold">Upcoming Elections</h1>
          <p className="text-white/60 mt-2">
            {abbr} election calendar. Stay informed and plan ahead.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <AnimatedSection>
          <div className="space-y-8">
            {elections.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
                <Calendar size={48} className="text-gray-300 mx-auto mb-4" />
                <h2 className="text-lg font-bold text-[#1B2A4A] mb-2">No Upcoming Elections Found</h2>
                <p className="text-sm text-gray-500">
                  No upcoming election records for {abbr} have been added to the database yet.
                </p>
                <Link
                  href={`/state/${abbr}/voter-info`}
                  className="inline-flex items-center gap-1.5 mt-6 text-sm font-semibold text-[#1B2A4A] hover:text-blue-700"
                >
                  View Voter Information →
                </Link>
              </div>
            ) : (
              elections.map((election) => {
                const days = daysUntil(election.date);
                const typeLabel = electionTypeLabel(election.electionType as ElectionType);
                const typeColor = electionTypeColor(election.electionType as ElectionType);
                const dateStr = election.date.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                });

                return (
                  <div
                    key={election.id}
                    className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
                  >
                    {/* Election header */}
                    <div className="p-6 border-b border-gray-100">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                        <div className="w-14 h-14 rounded-xl bg-[#1B2A4A]/5 flex flex-col items-center justify-center shrink-0">
                          <Calendar size={22} className="text-[#1B2A4A]" />
                        </div>

                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h2 className="text-xl font-bold text-[#1B2A4A]">{election.name}</h2>
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${typeColor}`}>
                              {typeLabel}
                            </span>
                            {days <= 30 && days >= 0 && (
                              <span className="text-xs font-bold bg-red-100 text-red-700 px-2.5 py-1 rounded-full animate-pulse">
                                Coming Soon
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                            <Clock size={14} className="text-[#1B2A4A]" />
                            <span className="font-semibold">{dateStr}</span>
                            <span className="text-gray-400">·</span>
                            <span className="text-gray-500">{days} day{days !== 1 ? "s" : ""} away</span>
                          </div>
                          {election.description && (
                            <p className="text-sm text-gray-600 leading-relaxed">
                              {election.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* What's on the ballot — placeholder section */}
                    <div className="px-6 py-5 border-b border-gray-100">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Vote size={13} />
                        Election Type
                      </h3>
                      <div className="flex items-start gap-2 text-sm text-gray-700">
                        <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                        {typeLabel} — {state?.name ?? abbr}
                      </div>
                    </div>

                    {/* Footer links */}
                    <div className="px-6 py-5 bg-gray-50">
                      <div className="mt-0 flex gap-3">
                        <Link
                          href={`/state/${abbr}/voter-info`}
                          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1B2A4A] hover:text-blue-700"
                        >
                          Register to Vote →
                        </Link>
                        <Link
                          href="/polling-places"
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-[#1B2A4A]"
                        >
                          <MapPin size={13} />
                          Find Polling Place
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Election calendar — all elections (past + upcoming) */}
            {(elections.length > 0 || pastElections.length > 0) && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-lg font-bold text-[#1B2A4A] mb-5 flex items-center gap-2">
                  <Calendar size={18} />
                  Election Calendar
                </h2>
                <div className="space-y-3">
                  {[...elections, ...pastElections]
                    .sort((a, b) => a.date.getTime() - b.date.getTime())
                    .map((election) => {
                      const isPast = election.date < new Date();
                      return (
                        <div key={election.id} className="flex items-center gap-4">
                          <span
                            className={`text-xs font-bold px-2.5 py-1 rounded-md text-white w-20 text-center shrink-0 ${
                              isPast
                                ? "bg-gray-400"
                                : electionTypeColor(election.electionType as ElectionType).replace(
                                    /text-\S+/,
                                    "text-white"
                                  ).replace(/bg-(\S+)-100/, "bg-$1-600")
                            }`}
                          >
                            {election.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                          <span className={`text-sm ${isPast ? "text-gray-400" : "text-gray-700"}`}>
                            {election.name}
                            {isPast && " (Past)"}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
}
