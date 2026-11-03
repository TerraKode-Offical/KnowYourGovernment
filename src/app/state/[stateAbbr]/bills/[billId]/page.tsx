import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, AlertTriangle, Bot } from "lucide-react";
import SubscribeForm from "@/components/features/SubscribeForm";
import BillStatusBadge from "@/components/ui/BillStatusBadge";
import BillDetailTabs from "@/components/features/BillDetailTabs";
import { prisma } from "@/lib/db";
import { BillStatus } from "@/types";
import { isEmailConfigured } from "@/lib/config";

// ─────────────────────────────────────────────
// Helper: map DB status → UI timeline steps
// ─────────────────────────────────────────────

function buildTimeline(status: BillStatus, introducedDate: Date, lastActionDate: Date | null) {
  const statusOrder: BillStatus[] = [
    BillStatus.INTRODUCED,
    BillStatus.IN_COMMITTEE,
    BillStatus.PASSED_HOUSE,
    BillStatus.PASSED_SENATE,
    BillStatus.SIGNED,
  ];
  const currentIdx = statusOrder.indexOf(status);

  const steps = [
    { label: "Introduced",       status: BillStatus.INTRODUCED,    date: introducedDate },
    { label: "In Committee",     status: BillStatus.IN_COMMITTEE,   date: null },
    { label: "Passed House",     status: BillStatus.PASSED_HOUSE,   date: null },
    { label: "Passed Senate",    status: BillStatus.PASSED_SENATE,  date: null },
    { label: "Presidential Action", status: BillStatus.SIGNED,      date: null },
  ];

  // Mark the last-action date on the current step
  if (currentIdx >= 0 && lastActionDate) {
    steps[currentIdx].date = lastActionDate;
  }

  return steps.map((step, idx) => ({
    label: step.label,
    date:
      idx === 0
        ? introducedDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : step.date
        ? step.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : idx <= currentIdx
        ? "Completed"
        : "Pending",
    done: idx <= currentIdx,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ stateAbbr: string; billId: string }>;
}): Promise<Metadata> {
  try {
    const { billId } = await params;
    const bill = await prisma.bill.findUnique({ where: { id: parseInt(billId, 10) } });
    if (!bill) return { title: "Bill Not Found" };
    return { title: `${bill.externalId} — ${bill.title}` };
  } catch {
    return { title: "Bill — InformedVoter" };
  }
}

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

export default async function BillDetailPage({
  params,
}: {
  params: Promise<{ stateAbbr: string; billId: string }>;
}) {
  const { stateAbbr, billId } = await params;
  const abbr = stateAbbr.toUpperCase();

  const billIdNum = parseInt(billId, 10);
  if (isNaN(billIdNum)) notFound();

  const bill = await prisma.bill.findUnique({
    where: { id: billIdNum },
    include: {
      sponsor: {
        select: {
          id: true,
          name: true,
          party: true,
          district: true,
          state: { select: { abbreviation: true } },
        },
      },
      cosponsors: {
        include: {
          candidate: {
            select: { id: true, name: true, party: true },
          },
        },
      },
      votes: {
        include: {
          candidate: { select: { id: true, name: true, party: true } },
        },
      },
    },
  });

  if (!bill) notFound();

  // Map hiddenClauses JSON to rider shape expected by BillDetailTabs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hiddenClauses = (bill.hiddenClauses as any[]) ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const riders = hiddenClauses.map((clause: any, idx: number) => ({
    id: String(idx),
    severity: (clause.severity ?? "yellow") as "red" | "orange" | "yellow",
    title: clause.title ?? `Hidden Clause ${idx + 1}`,
    section: clause.section ?? "",
    plainEnglish: clause.plainEnglish ?? clause.description ?? "",
    concern: clause.concern ?? "",
    votesFor: clause.votesFor ?? 0,
    votesAgainst: clause.votesAgainst ?? 0,
  }));

  // Compute vote totals from BillVote records
  const yesVotes = bill.votes.filter((v) => v.vote === "YES").length;
  const noVotes = bill.votes.filter((v) => v.vote === "NO").length;
  const abstainVotes = bill.votes.filter((v) => v.vote === "ABSTAIN" || v.vote === "NOT_VOTING").length;
  const totalVotes = bill.votes.length;

  const demYes = bill.votes.filter((v) => v.candidate.party === "D" && v.vote === "YES").length;
  const demNo = bill.votes.filter((v) => v.candidate.party === "D" && v.vote === "NO").length;
  const repYes = bill.votes.filter((v) => v.candidate.party === "R" && v.vote === "YES").length;
  const repNo = bill.votes.filter((v) => v.candidate.party === "R" && v.vote === "NO").length;

  const subjects = (bill.subjects as string[]) ?? [];
  const timeline = buildTimeline(bill.status as BillStatus, bill.introducedDate, bill.lastActionDate);

  const billForTabs = {
    number: bill.externalId,
    title: bill.title,
    aiSummary: bill.executiveSummary ?? bill.detailedSummary ?? "No summary available yet.",
    subjects,
    sponsor: {
      name: bill.sponsor?.name ?? "Unknown",
      party: bill.sponsor?.party ?? "—",
      district: bill.sponsor?.district
        ? `${bill.sponsor.state?.abbreviation ?? ""}-${bill.sponsor.district}`
        : (bill.sponsor?.state?.abbreviation ?? "—"),
    },
    chamber: bill.chamber === "HOUSE" ? "House" : "Senate",
    introducedDate: bill.introducedDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    lastActionDate: bill.lastActionDate
      ? bill.lastActionDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "—",
    lastAction: bill.aiRiderAnalysis ?? "—",
    statusTimeline: timeline,
    riders,
    fullTextUrl: bill.fullTextUrl ?? bill.congressGovUrl ?? "https://congress.gov",
    voteResults: {
      house: { yes: yesVotes, no: noVotes, abstain: abstainVotes, total: totalVotes },
      partyBreakdown: {
        dem: { yes: demYes, no: demNo },
        rep: { yes: repYes, no: repNo },
      },
    },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#1B2A4A] text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <nav className="flex items-center gap-1.5 text-white/50 text-sm mb-4 flex-wrap">
            <Link href="/" className="hover:text-white/80">Home</Link>
            <ChevronRight size={14} />
            <Link href={`/state/${abbr}`} className="hover:text-white/80">{abbr}</Link>
            <ChevronRight size={14} />
            <Link href={`/state/${abbr}/bills`} className="hover:text-white/80">Bills</Link>
            <ChevronRight size={14} />
            <span className="text-white/80">{bill.externalId}</span>
          </nav>

          <div className="flex flex-wrap items-start gap-3 mb-3">
            <span className="text-xs font-mono font-bold bg-white/10 px-2.5 py-1 rounded-md">
              {bill.externalId}
            </span>
            <BillStatusBadge status={bill.status} size="sm" />
            {riders.length > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-bold bg-amber-400/20 text-amber-300 px-2.5 py-1 rounded-full ring-1 ring-amber-400/30">
                <AlertTriangle size={11} />
                {riders.length} RIDER{riders.length > 1 ? "S" : ""} DETECTED
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold leading-tight mb-2">{bill.title}</h1>
          {bill.sponsor && (
            <p className="text-white/60 text-sm">
              Sponsored by {bill.sponsor.name} ({bill.sponsor.party}
              {bill.sponsor.state?.abbreviation ? `-${bill.sponsor.state.abbreviation}` : ""}
              {bill.sponsor.district ? `-${bill.sponsor.district}` : ""}) ·{" "}
              {bill.chamber === "HOUSE" ? "House" : "Senate"} · Introduced{" "}
              {bill.introducedDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          )}
        </div>
      </div>

      {/* AI Disclaimer */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="flex items-start gap-2.5 p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
          <Bot size={15} className="text-blue-500 shrink-0 mt-0.5" />
          <p>
            <strong>AI-assisted analysis:</strong> Summaries and rider analysis are generated using AI and reviewed for accuracy.
            This tool is for informational purposes only. Always verify with official sources before making decisions.
            <a href="/about#methodology" className="underline ml-1 hover:text-blue-600">Learn about our methodology.</a>
          </p>
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <BillDetailTabs bill={billForTabs} />
      </div>

      {/* Subscribe CTA */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
        <SubscribeForm
          stateAbbr={abbr}
          disabled={!isEmailConfigured()}
          heading="Want to know when this bill's status changes?"
          subtext={`Get notified about ${bill.externalId} and other ${abbr} legislation.`}
        />
      </div>
    </div>
  );
}
