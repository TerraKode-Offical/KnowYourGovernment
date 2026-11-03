import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, MapPin, CheckCircle2, Calendar, Vote, Shield } from "lucide-react";

export const metadata: Metadata = {
  title: "Voter Information — Registration, Deadlines, and Your Rights",
  description:
    "How to register, check your registration status, vote by mail, find your polling place, and exercise your rights at the polls — for every state.",
};

const NATIONAL_FACTS = [
  {
    icon: Calendar,
    title: "2026 Midterm Election",
    body: "Tuesday, November 3, 2026. Every U.S. House seat and one-third of U.S. Senate seats are on the ballot.",
  },
  {
    icon: CheckCircle2,
    title: "Registration Required",
    body: "You must be registered to vote. Deadlines vary by state; some allow same-day registration at the polls.",
  },
  {
    icon: MapPin,
    title: "Polling Place Lookup",
    body: "Every state has an official polling-place lookup. We link directly to your state's secretary-of-state tool.",
  },
  {
    icon: Shield,
    title: "Your Rights",
    body: "You have the right to cast a ballot even if your name isn't on the rolls (provisional) and to vote if in line when polls close.",
  },
];

export default function VoterInfoIndexPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#1B2A4A] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <nav className="flex items-center gap-1.5 text-white/50 text-sm mb-4">
            <Link href="/" className="hover:text-white/80">Home</Link>
            <ChevronRight size={14} />
            <span className="text-white/80">Voter Information</span>
          </nav>
          <h1 className="text-3xl sm:text-4xl font-bold">Voter Information</h1>
          <p className="text-white/60 mt-2 max-w-2xl">
            Voter rules — registration deadlines, absentee ballots, ID requirements,
            polling locations — are set state by state. Pick your state to see
            what applies to you.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/#select-state"
              className="inline-flex items-center gap-2 bg-white text-[#1B2A4A] font-semibold px-5 py-2.5 rounded-lg hover:bg-blue-50 transition-colors shadow-sm"
            >
              <Vote size={16} /> Pick Your State
            </Link>
            <Link
              href="/polling-places"
              className="inline-flex items-center gap-2 bg-transparent text-white font-semibold px-5 py-2.5 rounded-lg ring-1 ring-white/40 hover:bg-white/10 transition-colors"
            >
              <MapPin size={16} /> Find My Polling Place
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-bold text-[#1B2A4A] mb-6">Nationwide Basics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {NATIONAL_FACTS.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-3">
                  <Icon size={20} className="text-blue-600" />
                </div>
                <h3 className="font-bold text-[#1B2A4A] mb-1.5">{f.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{f.body}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-12 bg-[#1B2A4A] text-white rounded-2xl p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-bold mb-2">
            State-specific voter information
          </h2>
          <p className="text-white/70 mb-5 max-w-2xl">
            Registration deadlines, mail-in ballot rules, voter ID requirements,
            early voting schedules, and polling-place lookups vary by state.
            Choose your state to get the specifics that apply to you.
          </p>
          <Link
            href="/#select-state"
            className="inline-flex items-center gap-2 bg-white text-[#1B2A4A] font-semibold px-5 py-2.5 rounded-lg hover:bg-blue-50 transition-colors"
          >
            Select your state on the map
          </Link>
        </div>
      </div>
    </div>
  );
}
