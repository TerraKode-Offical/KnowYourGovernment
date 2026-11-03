import type { Metadata } from "next";
import Link from "next/link";
import {
  ChevronRight,
  ClipboardCheck,
  Search,
  Mail,
  Bell,
  Calendar,
  Clock,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Phone,
  ExternalLink,
} from "lucide-react";
import AnimatedSection from "@/components/features/AnimatedSection";
import BallotAddressInput from "@/components/features/BallotAddressInput";
import { prisma } from "@/lib/db";
import SubscribeForm from "@/components/features/SubscribeForm";
import { isEmailConfigured } from "@/lib/config";

const VOTER_RIGHTS = [
  {
    right: "Right to a ballot",
    detail: "You have the right to cast a ballot if you are a registered voter in the precinct.",
  },
  {
    right: "Right to assistance",
    detail: "You may bring someone to help you vote (except your employer or union representative). Language assistance is also available.",
  },
  {
    right: "Right to a provisional ballot",
    detail: "If your name does not appear on the voter rolls, you have the right to cast a provisional ballot.",
  },
  {
    right: "Right to take your time",
    detail: "You cannot be rushed or intimidated at the polls. Election officials must allow you a reasonable time to vote.",
  },
  {
    right: "Right to a working voting machine",
    detail: "If a machine is broken, you must be offered a working machine or a paper ballot.",
  },
  {
    right: "Right to report problems",
    detail: "If you experience problems at the polls, you can call the state voter hotline or the nonpartisan Election Protection hotline: 1-866-OUR-VOTE.",
  },
  {
    right: "No electioneering near polls",
    detail: "Political campaigning, signs, and solicitation are prohibited within 100 feet of polling place entrances.",
  },
  {
    right: "Right to a receipt for mail ballots",
    detail: "You can track your vote-by-mail ballot to confirm it was received and counted.",
  },
];

const MEDIA_LITERACY_TIPS = [
  {
    icon: "🔍",
    tip: "Check the source — Is it a known news organization? A government agency? An advocacy group?",
  },
  {
    icon: "📅",
    tip: "Check the date — Old news can be shared misleadingly to seem current.",
  },
  {
    icon: "📊",
    tip: "Look for primary sources — When a story cites a study or statistic, find the original source.",
  },
  {
    icon: "🏛️",
    tip: "Compare across outlets — Read coverage from multiple sources with different perspectives.",
  },
  {
    icon: "😡",
    tip: "Be wary of emotional language — Content designed to make you angry or fearful may be manipulative.",
  },
  {
    icon: "🤖",
    tip: "Watch for AI-generated content — Verify photos and videos using reverse image search or fact-check sites.",
  },
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ stateAbbr: string }>;
}): Promise<Metadata> {
  const { stateAbbr } = await params;
  return { title: `Voter Action Center — ${stateAbbr.toUpperCase()}` };
}

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

export default async function VoterInfoPage({
  params,
}: {
  params: Promise<{ stateAbbr: string }>;
}) {
  const { stateAbbr } = await params;
  const abbr = stateAbbr.toUpperCase();

  const state = await prisma.state.findUnique({ where: { abbreviation: abbr } });
  const voterInfo = state
    ? await prisma.voterInfo.findUnique({
        where: { stateId: state.id },
        include: {
          deadlines: {
            include: { election: { select: { name: true, date: true, electionType: true } } },
            orderBy: { deadlineDate: "asc" },
          },
        },
      })
    : null;

  // Build action cards from real data when available
  const actionCards = [
    {
      icon: ClipboardCheck,
      title: "Register to Vote",
      description: voterInfo?.onlineRegistration
        ? "Register online through the state's official portal."
        : "Register to vote through your state's official process.",
      cta: "Register Now",
      href: voterInfo?.registrationUrl ?? "https://vote.gov/register",
      turboVoteEmbed: false,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-100",
    },
    {
      icon: Search,
      title: "Check Your Registration",
      description: "Verify your current registration status, party affiliation, and polling place.",
      cta: "Check Status",
      href: voterInfo?.stateElectionWebsite ?? "https://vote.gov",
      turboVoteEmbed: false,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-100",
    },
    {
      icon: Mail,
      title: "Request Absentee Ballot",
      description: "Request a vote-by-mail ballot to be sent to your home address.",
      cta: "Request Ballot",
      href: voterInfo?.absenteeUrl ?? voterInfo?.stateElectionWebsite ?? "https://vote.gov",
      turboVoteEmbed: false,
      color: "text-purple-600",
      bg: "bg-purple-50",
      border: "border-purple-100",
    },
    {
      icon: Bell,
      title: "Get Election Reminders",
      description: "Sign up to receive text and email reminders about upcoming deadlines.",
      cta: "Set Reminders",
      href: "https://turbovote.org",
      turboVoteEmbed: true,
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-100",
    },
  ];

  const stateWebsite = voterInfo?.stateElectionWebsite ?? "https://vote.gov";

  // Build voting rules from real DB data
  const votingRules = voterInfo
    ? [
        {
          title: "Registration Deadline",
          value: voterInfo.registrationDeadline
            ? voterInfo.registrationDeadline.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
            : "Check your state website",
          note: voterInfo.sameDayRegistration
            ? "Same-day registration is available at the polls."
            : (voterInfo.additionalNotes ?? "Visit your state election website for the exact deadline."),
          link: voterInfo.registrationUrl ?? stateWebsite,
          linkLabel: "Register to Vote",
          icon: Calendar,
          color: "text-red-600",
          bg: "bg-red-50",
        },
        {
          title: "Voter ID Requirements",
          value: voterInfo.voterIdRequirements ?? "Check your state website",
          note: "Visit your state's official election website for full ID requirements and accepted forms of identification.",
          link: stateWebsite,
          linkLabel: "View Full ID Requirements",
          icon: ShieldCheck,
          color: "text-blue-600",
          bg: "bg-blue-50",
        },
        {
          title: "Early Voting",
          value: voterInfo.earlyVotingStart
            ? `Starts ${voterInfo.earlyVotingStart.toLocaleDateString("en-US", { month: "long", day: "numeric" })}`
            : "Check your state website for dates",
          note: voterInfo.earlyVotingEnd
            ? `Early voting ends ${voterInfo.earlyVotingEnd.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}. Contact your local election office for early voting locations and hours.`
            : "Early voting availability and dates vary. Visit your state election website for locations and hours.",
          link: stateWebsite,
          linkLabel: "Find Early Voting Locations",
          icon: ClipboardCheck,
          color: "text-emerald-600",
          bg: "bg-emerald-50",
        },
        {
          title: "Absentee / Vote-by-Mail",
          value: voterInfo.absenteeDeadline
            ? `Deadline: ${voterInfo.absenteeDeadline.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
            : "Available — check state website for deadlines",
          note: "Request your absentee ballot early to ensure it arrives and is returned on time.",
          link: voterInfo.absenteeUrl ?? stateWebsite,
          linkLabel: "Request Absentee Ballot",
          icon: Mail,
          color: "text-purple-600",
          bg: "bg-purple-50",
        },
        {
          title: "Polling Hours",
          value:
            voterInfo.pollingHoursStart && voterInfo.pollingHoursEnd
              ? `${voterInfo.pollingHoursStart} – ${voterInfo.pollingHoursEnd}`
              : "Check your state website",
          note: "Hours may vary by county. Check your local election office for exact times.",
          link: stateWebsite,
          linkLabel: "Find Your Polling Place",
          icon: Clock,
          color: "text-teal-600",
          bg: "bg-teal-50",
        },
      ]
    : [];

  // Build key dates from deadline records
  const keyDates = voterInfo?.deadlines
    ? voterInfo.deadlines.map((d) => ({
        label: `${d.election.name} — ${d.deadlineType.replace(/_/g, " ")}`,
        date: d.deadlineDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        rawDate: d.deadlineDate,
        color:
          d.deadlineType === "ELECTION_DAY"
            ? "bg-emerald-600"
            : d.deadlineType.includes("REGISTRATION")
            ? "bg-red-500"
            : "bg-blue-500",
      }))
    : [];

  const hotline = voterInfo?.electionProtectionHotline ?? "866-OUR-VOTE";
  const hotlineHref = `tel:1${hotline.replace(/-/g, "")}`;

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
            <span className="text-white/80">Voter Action Center</span>
          </nav>
          <h1 className="text-3xl sm:text-4xl font-bold">Voter Action Center</h1>
          <p className="text-white/60 mt-2">
            Everything you need to register, vote, and exercise your rights in {abbr}.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        {/* ── Section A: Action Cards ── */}
        <AnimatedSection delay={0}>
          <section>
            <h2 className="text-2xl font-bold text-[#1B2A4A] mb-2">Take Action</h2>
            <p className="text-base text-gray-500 mb-6">
              Quick links to official voter registration and ballot tools.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {actionCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.title}
                    className={`flex flex-col gap-4 p-5 rounded-2xl border ${card.border} ${card.bg}`}
                  >
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-white shadow-sm">
                      <Icon size={22} className={card.color} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-[#1B2A4A] text-base mb-1">{card.title}</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">{card.description}</p>
                      {card.turboVoteEmbed && (
                        <span className="inline-block mt-2 text-xs font-medium bg-white/70 text-gray-500 px-2 py-0.5 rounded">
                          Powered by TurboVote
                        </span>
                      )}
                    </div>
                    <a
                      href={card.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center justify-center gap-1.5 text-sm font-bold ${card.color} bg-white px-4 py-2.5 rounded-lg hover:shadow-sm transition-shadow`}
                    >
                      {card.cta} <ExternalLink size={14} />
                    </a>
                  </div>
                );
              })}
            </div>
          </section>
        </AnimatedSection>

        {/* ── Section B: State Voting Rules ── */}
        {votingRules.length > 0 && (
          <AnimatedSection delay={0.05}>
            <section>
              <h2 className="text-2xl font-bold text-[#1B2A4A] mb-2">{abbr} Voting Rules</h2>
              <p className="text-base text-gray-500 mb-6">
                State-specific rules for registration, ID requirements, and voting options.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {votingRules.map((rule) => {
                  const Icon = rule.icon;
                  return (
                    <div key={rule.title} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${rule.bg} shrink-0`}>
                          <Icon size={20} className={rule.color} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-[#1B2A4A] text-base mb-0.5">{rule.title}</h3>
                          <p className={`text-base font-bold ${rule.color} mb-2`}>{rule.value}</p>
                          <p className="text-sm text-gray-600 leading-relaxed mb-3">{rule.note}</p>
                          <a
                            href={rule.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-1.5 text-sm font-semibold ${rule.color} hover:underline`}
                          >
                            {rule.linkLabel} <ExternalLink size={13} />
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </AnimatedSection>
        )}

        {/* ── Section C: Know Your Rights ── */}
        <AnimatedSection delay={0.1}>
          <section>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-[#1B2A4A] text-white p-6">
                <div className="flex items-center gap-3">
                  <ShieldCheck size={24} />
                  <div>
                    <h2 className="text-2xl font-bold">Know Your Rights at the Polls</h2>
                    <p className="text-white/70 text-base mt-0.5">
                      You have federally and state-protected rights as a voter.
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {VOTER_RIGHTS.map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                      <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-base font-semibold text-[#1B2A4A]">{item.right}</p>
                        <p className="text-base text-gray-600 leading-relaxed mt-0.5">{item.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                  <Phone size={18} className="text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-base font-bold text-red-800">Experiencing problems at the polls?</p>
                    <p className="text-base text-red-700 mt-0.5">
                      Call the nonpartisan Election Protection hotline:{" "}
                      <a href={hotlineHref} className="font-bold underline hover:no-underline">
                        1-{hotline}
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </AnimatedSection>

        {/* ── Section D: What's on My Ballot ── */}
        <AnimatedSection delay={0.15}>
          <section>
            <h2 className="text-2xl font-bold text-[#1B2A4A] mb-2">What&apos;s On My Ballot?</h2>
            <p className="text-base text-gray-500 mb-6">
              Enter your address to see your personalized sample ballot.
            </p>
            <BallotAddressInput />
          </section>
        </AnimatedSection>

        {/* ── Section E: Key Dates ── */}
        {keyDates.length > 0 && (
          <AnimatedSection delay={0.2}>
            <section>
              <h2 className="text-2xl font-bold text-[#1B2A4A] mb-2">Key Dates</h2>
              <p className="text-base text-gray-500 mb-6">
                Important electoral deadlines and election days for {abbr}.
              </p>
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <div className="space-y-3">
                  {keyDates.map((item, i) => (
                    <div key={i} className="flex items-center gap-4 py-2 border-b border-gray-50 last:border-0">
                      <span className={`text-sm font-bold text-white px-3 py-1.5 rounded-md shrink-0 min-w-[100px] text-center ${item.color}`}>
                        {item.date.split(",")[0]}
                      </span>
                      <span className="text-base text-gray-700">{item.label}</span>
                      <span className="ml-auto text-sm text-gray-400 shrink-0 hidden sm:block">{item.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </AnimatedSection>
        )}

        {/* ── Subscribe CTA ── */}
        <AnimatedSection delay={0.25}>
          <SubscribeForm
            stateAbbr={abbr}
            disabled={!isEmailConfigured()}
            heading={`Get deadline reminders for ${state?.name ?? abbr}`}
            subtext="We'll email you when registration deadlines, early voting, and election dates are approaching."
          />
        </AnimatedSection>

        {/* ── Section F: Media Literacy ── */}
        <AnimatedSection delay={0.3}>
          <section>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-2xl font-bold text-[#1B2A4A] mb-1 flex items-center gap-2">
                <AlertTriangle size={20} className="text-amber-500" />
                Media Literacy for Voters
              </h2>
              <p className="text-base text-gray-500 mb-6">
                Tips for evaluating political news and protecting yourself from disinformation.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {MEDIA_LITERACY_TIPS.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                    <span className="text-2xl shrink-0">{item.icon}</span>
                    <p className="text-base text-gray-700 leading-relaxed">{item.tip}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </AnimatedSection>
      </div>
    </div>
  );
}
