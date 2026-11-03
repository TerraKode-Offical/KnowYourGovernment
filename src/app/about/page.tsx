import type { Metadata } from "next";
import Link from "next/link";
import {
  ChevronRight,
  ShieldCheck,
  Bot,
  Database,
  Eye,
  Scale,
  Heart,
  Mail,
  Globe,
  AlertTriangle,
  CheckCircle2,
  Landmark,
} from "lucide-react";
import AnimatedSection from "@/components/features/AnimatedSection";

export const revalidate = 86400; // ISR: regenerate once per day

export const metadata: Metadata = {
  title: "About InformedVoter",
  description:
    "Learn about InformedVoter's mission, methodology, data sources, and commitment to nonpartisan civic information.",
};

const DATA_SOURCES = [
  {
    name: "Congress.gov / GovTrack",
    description: "Federal bill text, status, voting records, and sponsor information from official congressional sources.",
    icon: Landmark,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    name: "Federal Election Commission (FEC)",
    description: "Campaign finance data including contributions, expenditures, PAC funding, and donor disclosures.",
    icon: Database,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    name: "State Election Offices",
    description: "Voter registration information, election dates, and polling place data from official state sources.",
    icon: ShieldCheck,
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    name: "VoteSmart",
    description: "Candidate positions on issues, biographical data, and public statements.",
    icon: Eye,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    name: "LegiScan",
    description: "State and federal bill text, roll call votes, and legislative tracking across all 50 states.",
    icon: Scale,
    color: "text-rose-600",
    bg: "bg-rose-50",
  },
];

const AI_USES = [
  {
    title: "Bill Summaries",
    description: "We use AI to translate complex legislative language into clear, plain-English summaries. The AI is instructed to present both sides of contested provisions without taking a political stance.",
    safe: true,
  },
  {
    title: "Rider / Hidden Clause Detection",
    description: "AI scans full bill text to identify provisions that appear unrelated to the bill's stated purpose. Findings are flagged for human review before publication.",
    safe: true,
  },
  {
    title: "Policy Position Summaries",
    description: "Candidate policy positions are summarized from public statements, voting records, and interviews. AI is instructed to summarize rather than evaluate or rank positions.",
    safe: true,
  },
  {
    title: "What AI Does NOT Do",
    description: "InformedVoter AI does not make endorsements, predict election outcomes, generate political opinions, or create content without citing sources. All AI output is reviewed.",
    safe: false,
  },
];

const DISCLAIMERS = [
  "InformedVoter is an independent, nonpartisan platform. We are not affiliated with any political party, candidate, government agency, or advocacy organization.",
  "While we strive for accuracy, information on this site may be out of date. Always verify critical information with official government sources before making decisions.",
  "AI-generated summaries and analysis are produced to inform, not to advocate. They may contain errors. We do not accept responsibility for decisions made based on content from this site.",
  "Campaign finance data is sourced from public FEC filings and may not reflect the most current reporting period.",
  "Voter registration and polling place information varies by state. Always confirm details with your local election officials.",
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#1B2A4A] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <nav className="flex items-center gap-1.5 text-white/50 text-sm mb-6">
            <Link href="/" className="hover:text-white/80">Home</Link>
            <ChevronRight size={14} />
            <span className="text-white/80">About</span>
          </nav>

          <div className="flex items-start gap-4 mb-6">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center ring-1 ring-white/20 shrink-0">
              <Landmark size={26} />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold">About InformedVoter</h1>
              <p className="text-white/60 mt-2 text-lg">
                Transparent. Nonpartisan. Empowering.
              </p>
            </div>
          </div>

          <p className="text-white/70 leading-relaxed max-w-2xl text-base">
            InformedVoter is a free, nonpartisan civic information platform dedicated to making
            it easier for every American to participate in democracy — without partisan spin, ads,
            or hidden agendas.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        {/* ── Mission ── */}
        <AnimatedSection delay={0}>
          <section>
            <h2 className="text-2xl font-bold text-[#1B2A4A] mb-6">Our Mission</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {[
                {
                  icon: ShieldCheck,
                  title: "Nonpartisan",
                  description: "We present facts, context, and analysis without partisan framing. We do not endorse candidates, parties, or political positions.",
                  color: "text-blue-600",
                  bg: "bg-blue-50",
                  border: "border-blue-100",
                },
                {
                  icon: Eye,
                  title: "Transparent",
                  description: "Every summary cites its sources. Our AI methodology is documented. We explain what we do — and what we don't do.",
                  color: "text-emerald-600",
                  bg: "bg-emerald-50",
                  border: "border-emerald-100",
                },
                {
                  icon: Heart,
                  title: "Empowering",
                  description: "We believe informed citizens make better voters. Our goal is to lower the information barrier to civic participation for everyone.",
                  color: "text-rose-600",
                  bg: "bg-rose-50",
                  border: "border-rose-100",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className={`p-6 rounded-2xl border ${item.border} ${item.bg}`}>
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center bg-white shadow-sm mb-4`}>
                      <Icon size={20} className={item.color} />
                    </div>
                    <h3 className="font-bold text-[#1B2A4A] mb-2">{item.title}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
                  </div>
                );
              })}
            </div>
          </section>
        </AnimatedSection>

        {/* ── Methodology ── */}
        <AnimatedSection delay={0.05}>
          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-[#1B2A4A] mb-2">Data Sources & Methodology</h2>
            <p className="text-gray-500 mb-6 text-sm leading-relaxed">
              InformedVoter aggregates data from official government sources and reputable nonpartisan organizations.
              We do not create or manufacture political data — we aggregate, summarize, and contextualize existing public information.
            </p>

            <div className="space-y-4">
              {DATA_SOURCES.map((source) => {
                const Icon = source.icon;
                return (
                  <div key={source.name} className="flex items-start gap-4 p-4 rounded-xl bg-gray-50">
                    <div className={`w-10 h-10 rounded-lg ${source.bg} flex items-center justify-center shrink-0`}>
                      <Icon size={18} className={source.color} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#1B2A4A] text-sm">{source.name}</h3>
                      <p className="text-sm text-gray-500 leading-relaxed mt-0.5">{source.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </AnimatedSection>

        {/* ── AI Transparency ── */}
        <AnimatedSection delay={0.1}>
          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-[#1B2A4A] mb-2 flex items-center gap-3">
              <Bot size={22} className="text-blue-500" />
              AI Transparency
            </h2>
            <p className="text-gray-500 mb-6 text-sm leading-relaxed">
              InformedVoter uses AI (specifically, Claude by Anthropic) to help make complex civic information accessible.
              We believe in being fully transparent about how and where AI is used.
            </p>

            <div className="space-y-4">
              {AI_USES.map((use) => (
                <div
                  key={use.title}
                  className={`p-4 rounded-xl border ${use.safe ? "border-emerald-100 bg-emerald-50" : "border-amber-100 bg-amber-50"}`}
                >
                  <div className="flex items-start gap-3">
                    {use.safe ? (
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <h3 className={`font-semibold text-sm ${use.safe ? "text-emerald-900" : "text-amber-900"}`}>
                        {use.title}
                      </h3>
                      <p className={`text-sm leading-relaxed mt-0.5 ${use.safe ? "text-emerald-800" : "text-amber-800"}`}>
                        {use.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </AnimatedSection>

        {/* ── Disclaimers ── */}
        <AnimatedSection delay={0.15}>
          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-[#1B2A4A] mb-6 flex items-center gap-3">
              <AlertTriangle size={20} className="text-amber-500" />
              Important Disclaimers
            </h2>
            <div className="space-y-4">
              {DISCLAIMERS.map((disclaimer, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                  <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-sm text-gray-600 leading-relaxed">{disclaimer}</p>
                </div>
              ))}
            </div>
          </section>
        </AnimatedSection>

        {/* ── Contact ── */}
        <AnimatedSection delay={0.2}>
          <section className="bg-[#1B2A4A] text-white rounded-2xl p-6 sm:p-8">
            <h2 className="text-2xl font-bold mb-2">Contact Us</h2>
            <p className="text-white/60 mb-6 text-sm">
              Questions, corrections, or feedback? We&apos;re committed to accuracy and transparency.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <a
                href="mailto:info@knowyourgov.us"
                className="flex items-center gap-3 p-4 bg-white/10 rounded-xl hover:bg-white/15 transition-colors"
              >
                <Mail size={20} className="text-blue-300 shrink-0" />
                <div>
                  <p className="text-xs text-white/50">General inquiries</p>
                  <p className="text-sm font-semibold">info@knowyourgov.us</p>
                </div>
              </a>
              <a
                href="mailto:corrections@knowyourgov.us"
                className="flex items-center gap-3 p-4 bg-white/10 rounded-xl hover:bg-white/15 transition-colors"
              >
                <AlertTriangle size={20} className="text-amber-300 shrink-0" />
                <div>
                  <p className="text-xs text-white/50">Report a correction</p>
                  <p className="text-sm font-semibold">corrections@knowyourgov.us</p>
                </div>
              </a>
              <a
                href="https://knowyourgov.us"
                className="flex items-center gap-3 p-4 bg-white/10 rounded-xl hover:bg-white/15 transition-colors"
              >
                <Globe size={20} className="text-emerald-300 shrink-0" />
                <div>
                  <p className="text-xs text-white/50">Website</p>
                  <p className="text-sm font-semibold">knowyourgov.us</p>
                </div>
              </a>
            </div>

            <p className="mt-6 text-xs text-white/40 text-center">
              © {new Date().getFullYear()} InformedVoter. All rights reserved. Not affiliated with any government agency or political organization.
            </p>
          </section>
        </AnimatedSection>
      </div>
    </div>
  );
}
