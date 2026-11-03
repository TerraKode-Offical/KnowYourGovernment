import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import USStateMap from "@/components/features/USStateMap";
import FederalAgenciesSection from "@/components/features/FederalAgenciesSection";
import { ExploreStateButton, QuickActions, VoterEssentials } from "@/components/features/HomepageLinks";

// ─────────────────────────────────────────────
// Metadata
// ─────────────────────────────────────────────

export const metadata: Metadata = {
  title: "InformedVoter — Your Government, In Plain English",
  description:
    "Understand your government without the jargon. Congress, Supreme Court, federal agencies, campaign finance, and your ballot — explained simply.",
};

// ─────────────────────────────────────────────
// Page (Server Component)
// ─────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* ── Hero + Interactive Map ── */}
      <section className="relative overflow-hidden bg-[#1B2A4A] text-white">
        {/* Decorative background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-red-700/10 rounded-full translate-y-1/2 -translate-x-1/4" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* Left: text */}
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 text-white/80 text-sm font-medium px-3 py-1.5 rounded-full mb-6 ring-1 ring-white/20">
                <ShieldCheck size={14} />
                100% Nonpartisan · No Ads · No Spin
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-6 text-white">
                Your Government,{" "}
                <br className="hidden sm:inline" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-cyan-300">
                  In Plain English
                </span>
              </h1>

              <p className="text-base text-white/70 mb-8 max-w-lg leading-relaxed">
                Congress, the Supreme Court, federal agencies, campaign finance,
                and your ballot — all in one place, explained without jargon or
                partisan spin.
              </p>

              <div className="flex flex-wrap gap-4">
                <ExploreStateButton />
                <Link
                  href="/polling-places"
                  className="inline-flex items-center gap-2 bg-transparent text-white font-semibold px-6 py-3 rounded-lg ring-1 ring-white/40 hover:bg-white/10 transition-colors"
                >
                  Find My Polling Place
                </Link>
              </div>
            </div>

            {/* Right: interactive map */}
            <div id="select-state">
              <USStateMap variant="dark" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Quick Actions ── */}
      <section className="bg-gray-50 py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#1B2A4A] mb-2">
              What do you need to know?
            </h2>
            <p className="text-gray-500">
              Choose a topic to get started with your state&apos;s civic information.
            </p>
          </div>

          <QuickActions />
        </div>
      </section>

      {/* ── Federal Agencies ── */}
      <FederalAgenciesSection />

      {/* ── Voter Essentials ── */}
      <section className="bg-gray-50 py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#1B2A4A] mb-2">
              What Every Voter Should Know
            </h2>
            <p className="text-gray-500">
              Essential knowledge for participating in American democracy.
            </p>
          </div>

          <VoterEssentials />
        </div>
      </section>

      {/* ── Mission Banner ── */}
      <section className="bg-[#1B2A4A] text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-white/60 text-sm font-medium uppercase tracking-widest mb-3">
            Our Commitment
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            Transparent. Nonpartisan. Empowering.
          </h2>
          <p className="text-white/70 max-w-2xl mx-auto text-base leading-relaxed mb-6">
            InformedVoter uses AI to cut through legal jargon and make government
            accessible — from 500-page bills to Supreme Court rulings to agency budgets.
            Always sourced, always nonpartisan.
          </p>
          <Link
            href="/about"
            className="inline-flex items-center gap-2 text-blue-300 hover:text-blue-200 font-medium text-sm"
          >
            Learn about our methodology <ArrowRight size={14} />
          </Link>
        </div>
      </section>
    </div>
  );
}
