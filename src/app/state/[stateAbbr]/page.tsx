import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Users,
  UserCheck,
  Building2,
  FileText,
  Landmark,
  Vote,
  BookOpen,
  DollarSign,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import AnimatedSection from "@/components/features/AnimatedSection";
import { prisma } from "@/lib/db";
import { OfficeType } from "@/types";

// Render on every request so notFound() emits a real 404 status for
// unknown state abbreviations instead of returning a cached 200.
export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────
// Metadata
// ─────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ stateAbbr: string }>;
}): Promise<Metadata> {
  try {
    const { stateAbbr } = await params;
    const state = await prisma.state.findUnique({
      where: { abbreviation: stateAbbr.toUpperCase() },
    });
    const stateName = state?.name ?? stateAbbr.toUpperCase();
    return {
      title: `${stateName} Voter Dashboard`,
      description: `Civic information for ${stateName}: senators, representatives, bills, elections, and voter resources.`,
    };
  } catch {
    return { title: "State Voter Dashboard — InformedVoter" };
  }
}

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

export default async function StateDashboardPage({
  params,
}: {
  params: Promise<{ stateAbbr: string }>;
}) {
  const { stateAbbr } = await params;
  const abbr = stateAbbr.toUpperCase();

  const state = await prisma.state.findUnique({
    where: { abbreviation: abbr },
  });

  if (!state) notFound();

  // Fetch real counts in parallel.
  // Federal bills are not state-scoped, so "bills for this state" means bills
  // sponsored by a member of this state's congressional delegation.
  const [senatorCount, repCount, governorCount, billCount, electionCount] = await Promise.all([
    prisma.candidate.count({
      where: { stateId: state.id, officeType: OfficeType.US_SENATOR },
    }),
    prisma.candidate.count({
      where: { stateId: state.id, officeType: OfficeType.US_REPRESENTATIVE, isIncumbent: true },
    }),
    prisma.candidate.count({
      where: { stateId: state.id, officeType: OfficeType.GOVERNOR, isIncumbent: true },
    }),
    prisma.bill.count({
      where: { sponsor: { stateId: state.id } },
    }),
    prisma.election.count({
      where: { stateId: state.id, date: { gte: new Date() } },
    }),
  ]);

  const sections = [
    {
      icon: UserCheck,
      title: "U.S. Senators",
      description: `${senatorCount || 2} senators representing your state in Washington`,
      href: `/state/${abbr}/senators`,
      count: `${senatorCount || 2} Senators`,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-100",
    },
    {
      icon: Users,
      title: "U.S. Representatives",
      description: "Your House representatives in Congress",
      href: `/state/${abbr}/representatives`,
      count: repCount > 0 ? `${repCount} Reps` : "Not available",
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      border: "border-indigo-100",
    },
    {
      icon: Building2,
      title: "Governor",
      description: `The current governor of ${state.name}`,
      href: `/state/${abbr}/governor`,
      count: governorCount > 0 ? "1 Governor" : "Coming soon",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-100",
    },
    {
      icon: FileText,
      title: "Federal Bills",
      description: `Bills sponsored by ${state.name}'s congressional delegation`,
      href: `/state/${abbr}/bills`,
      count: billCount > 0 ? `${billCount} Bills` : "None this session",
      color: "text-purple-600",
      bg: "bg-purple-50",
      border: "border-purple-100",
    },
    {
      icon: Landmark,
      title: "State Bills",
      description: "Bills moving through the state legislature",
      href: `/state/${abbr}/bills`,
      count: "Coming soon",
      color: "text-violet-600",
      bg: "bg-violet-50",
      border: "border-violet-100",
    },
    {
      icon: Vote,
      title: "Upcoming Elections",
      description: "Scheduled elections and what's on the ballot",
      href: `/state/${abbr}/elections`,
      count: electionCount > 0 ? `${electionCount} Upcoming` : "None scheduled",
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-100",
    },
    {
      icon: BookOpen,
      title: "Voter Action Center",
      description: "Register, check status, absentee ballots, and your rights",
      href: `/state/${abbr}/voter-info`,
      count: "6 Sections",
      color: "text-teal-600",
      bg: "bg-teal-50",
      border: "border-teal-100",
    },
    {
      icon: DollarSign,
      title: "Campaign Finance",
      description: "Who is funding campaigns and how money flows in elections",
      href: "/pac-recipients",
      count: "View data",
      color: "text-rose-600",
      bg: "bg-rose-50",
      border: "border-rose-100",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Page Header ── */}
      <div className="bg-[#1B2A4A] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-white/50 text-sm mb-6">
            <Link href="/" className="hover:text-white/80 transition-colors">Home</Link>
            <ChevronRight size={14} />
            <span className="text-white/80">{state.name}</span>
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-5xl font-black text-white/20 select-none">{abbr}</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold">
                {state.name} Voter Dashboard
              </h1>
              <p className="text-white/60 mt-2 text-sm">
                FIPS: {state.fipsCode}
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href={`/state/${abbr}/voter-info`}
                className="inline-flex items-center gap-2 bg-white text-[#1B2A4A] font-semibold text-sm px-4 py-2.5 rounded-lg hover:bg-blue-50 transition-colors"
              >
                Register to Vote <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Dashboard Grid ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <p className="text-sm text-gray-500 mb-8 font-medium uppercase tracking-wider">
          Explore {state.name} Civic Information
        </p>

        <AnimatedSection>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <Link
                  key={section.title}
                  href={section.href}
                  className={`group flex flex-col gap-4 p-6 rounded-2xl border ${section.border} ${section.bg} bg-white hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200`}
                >
                  <div className="flex items-start justify-between">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center bg-white shadow-sm ring-1 ring-black/5`}>
                      <Icon size={20} className={section.color} />
                    </div>
                    <span className={`text-xs font-semibold ${section.color} bg-white px-2 py-1 rounded-full ring-1 ring-current/20`}>
                      {section.count}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-[#1B2A4A] text-base mb-1">
                      {section.title}
                    </h3>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      {section.description}
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold ${section.color} group-hover:gap-2 transition-all`}>
                    View Details <ArrowRight size={12} />
                  </span>
                </Link>
              );
            })}
          </div>
        </AnimatedSection>

        {/* ── Quick Stats Bar ── */}
        <div className="mt-12 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-5">
            At a Glance — {state.name}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 divide-x divide-gray-100">
            {[
              { label: "Bills Sponsored",    value: billCount > 0 ? String(billCount) : "—" },
              { label: "Senators",           value: String(senatorCount || 2) },
              { label: "Representatives",    value: repCount > 0 ? String(repCount) : "—" },
              { label: "Upcoming Elections", value: electionCount > 0 ? String(electionCount) : "—" },
            ].map((stat) => (
              <div key={stat.label} className="pl-6 first:pl-0">
                <div className="text-2xl font-bold text-[#1B2A4A]">{stat.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
