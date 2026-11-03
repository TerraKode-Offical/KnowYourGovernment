import Link from "next/link";
import { Landmark, ExternalLink } from "lucide-react";

// ─────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────

const DATA_SOURCES = [
  { label: "Congress.gov",                    href: "https://congress.gov" },
  { label: "OpenFEC",                         href: "https://api.open.fec.gov" },
  { label: "LegiScan",                         href: "https://legiscan.com" },
  { label: "Google Civic Information API",    href: "https://developers.google.com/civic-information" },
] as const;

const FOOTER_LINKS = [
  { label: "About",    href: "/about"   },
  { label: "Privacy",  href: "/privacy" },
  { label: "Contact",  href: "/contact" },
] as const;

const CURRENT_YEAR = new Date().getFullYear();

// ─────────────────────────────────────────────
// Component — Server Component (no "use client")
// ─────────────────────────────────────────────

export default function Footer() {
  return (
    <footer
      className="w-full bg-[#111D33] text-white/80 mt-auto"
      role="contentinfo"
      aria-label="Site footer"
    >
      {/* Top accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-16">

          {/* ── Brand column ── */}
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 mb-4 group focus-visible:outline-none
                         focus-visible:ring-2 focus-visible:ring-white/30 rounded-lg"
              aria-label="InformedVoter — Home"
            >
              <span
                className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/10
                           group-hover:bg-white/20 transition-colors"
                aria-hidden="true"
              >
                <Landmark size={16} className="text-white" />
              </span>
              <span className="font-serif font-bold text-white text-base tracking-tight">
                Informed<span className="text-[#D69E2E]">Voter</span>
              </span>
            </Link>
            <p className="text-sm text-white/55 leading-relaxed max-w-xs">
              Your government, explained in plain English. Congress, the Supreme Court,
              federal agencies, and your ballot — nonpartisan and jargon-free.
            </p>
          </div>

          {/* ── Links column ── */}
          <div>
            <h2 className="font-serif font-semibold text-white text-sm uppercase tracking-widest mb-4">
              Navigate
            </h2>
            <nav aria-label="Footer navigation">
              <ul className="space-y-2.5" role="list">
                {FOOTER_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/60 hover:text-white transition-colors
                                 focus-visible:outline-none focus-visible:ring-2
                                 focus-visible:ring-white/30 rounded"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* ── Data sources column ── */}
          <div>
            <h2 className="font-serif font-semibold text-white text-sm uppercase tracking-widest mb-4">
              Data Sources
            </h2>
            <ul className="space-y-2.5" role="list">
              {DATA_SOURCES.map((source) => (
                <li key={source.href}>
                  <a
                    href={source.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-white/60
                               hover:text-white transition-colors focus-visible:outline-none
                               focus-visible:ring-2 focus-visible:ring-white/30 rounded"
                  >
                    {source.label}
                    <ExternalLink size={12} aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="border-t border-white/10 mt-10 pt-8 space-y-4">

          {/* Nonpartisan disclaimer */}
          <p className="text-xs text-white/45 leading-relaxed">
            <strong className="text-white/60 font-semibold">Nonpartisan Disclaimer:</strong>{" "}
            InformedVoter does not endorse, support, or oppose any political candidate, party, or
            ballot measure. Information is presented neutrally to help voters make their own
            informed decisions. We receive no funding from political campaigns, parties, PACs,
            or government entities.
          </p>

          {/* AI disclaimer */}
          <p className="text-xs text-white/45 leading-relaxed">
            <strong className="text-white/60 font-semibold">AI-Assisted Content Notice:</strong>{" "}
            Some summaries and analyses on this site are generated with the assistance of artificial
            intelligence and reviewed for factual accuracy. AI-generated content may contain errors.
            Always consult primary sources and official government websites for authoritative
            information before making voting decisions.
          </p>

          {/* Copyright */}
          <p className="text-xs text-white/35">
            &copy; {CURRENT_YEAR} InformedVoter. All rights reserved.
            Not affiliated with any government agency or political organization.
          </p>
        </div>
      </div>
    </footer>
  );
}
