import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, ChevronRight, ExternalLink, Info } from "lucide-react";
import PollingPlaceFinder from "@/components/features/PollingPlaceFinder";

export const metadata: Metadata = {
  title: "Polling Place Finder",
  description: "Find your polling place, hours, and directions for upcoming elections.",
};

export default function PollingPlacesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#1B2A4A] text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <nav className="flex items-center gap-1.5 text-white/50 text-sm mb-4">
            <Link href="/" className="hover:text-white/80">Home</Link>
            <ChevronRight size={14} />
            <span className="text-white/80">Polling Places</span>
          </nav>
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center shrink-0 ring-1 ring-white/20">
              <MapPin size={24} />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold">Polling Place Finder</h1>
              <p className="text-white/60 mt-1">
                Find your nearest polling locations, hours, and accessibility information.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <PollingPlaceFinder />

        {/* Fallback / Official links */}
        <div className="mt-8 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-start gap-3">
            <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-[#1B2A4A] mb-2">Official State Polling Place Lookups</h3>
              <p className="text-sm text-gray-500 mb-4">
                For the most accurate and official polling place information, use your state&apos;s official resources:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { name: "California", href: "https://www.sos.ca.gov/elections/polling-place" },
                  { name: "New York", href: "https://www.elections.ny.gov" },
                  { name: "Texas", href: "https://teamrv-mvp.sos.texas.gov/MVP/mvp.do" },
                  { name: "Florida", href: "https://dos.fl.gov/elections/for-voters/voting/find-your-polling-place/" },
                  { name: "All States (vote.gov)", href: "https://vote.gov/where-to-vote/", highlight: true },
                ].map((link) => (
                  <a
                    key={link.name}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors ${
                      link.highlight
                        ? "bg-[#1B2A4A] text-white hover:bg-[#2D4066]"
                        : "border border-gray-200 text-[#1B2A4A] hover:bg-gray-50"
                    }`}
                  >
                    {link.name} <ExternalLink size={12} />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
