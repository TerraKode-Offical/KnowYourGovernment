"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Search,
  FileText,
  User,
  Scale,
  Map,
  Building2,
  Landmark,
  DollarSign,
  Vote,
  MapPin,
  GitCompare,
  Terminal,
  FileQuestion,
  ShieldAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ─────────────────────────────────────────────
// Route Pattern → Joke Message Mapping
// ─────────────────────────────────────────────

interface NotFoundContent {
  heading: string;
  message: string;
  icon: LucideIcon;
}

const DEFAULT_CONTENT: NotFoundContent = {
  heading: "Page Not Found",
  message:
    "This page has been placed in an undisclosed location for national security reasons. We cannot confirm nor deny its existence.",
  icon: ShieldAlert,
};

function matchContent(pathname: string): NotFoundContent {
  // Priority order: most specific patterns first

  if (pathname.match(/^\/(?:state\/[^/]+\/)?bills\/.+/)) {
    return {
      heading: "Bill Not Found",
      message:
        "This page cannot be found. It may have been detained for exposing too much information about this bill's hidden riders.",
      icon: FileText,
    };
  }

  if (pathname.match(/^\/candidate\/.+/)) {
    return {
      heading: "Candidate Not Found",
      message:
        "This page cannot be found. It may have been detained for exposing too much information about this candidate's voting record.",
      icon: User,
    };
  }

  if (pathname.match(/^\/judicial\/cases\/.+/)) {
    return {
      heading: "Case Not Found",
      message:
        "This page has been sealed under executive privilege. The CIA must have abducted it during discovery.",
      icon: Scale,
    };
  }

  if (pathname.match(/^\/judicial\/justices\/.+/)) {
    return {
      heading: "Justice Not Found",
      message:
        "This page cannot be found. It appears to have recused itself from this URL.",
      icon: Scale,
    };
  }

  if (pathname.match(/^\/state\/.+/)) {
    return {
      heading: "State Page Not Found",
      message:
        "This page cannot be found. It may have been gerrymandered out of existence.",
      icon: Map,
    };
  }

  if (pathname.match(/^\/local\/.+/)) {
    return {
      heading: "Local Page Not Found",
      message:
        "This page missed the public comment period and was voted off the agenda.",
      icon: Building2,
    };
  }

  if (pathname.match(/^\/agencies\/.+/)) {
    return {
      heading: "Agency Page Not Found",
      message:
        "This page has been redacted under Section 552(b) of the FOIA. The black highlighters got to it first.",
      icon: Landmark,
    };
  }

  if (pathname.match(/^\/pac-recipients\/.+/)) {
    return {
      heading: "PAC Page Not Found",
      message:
        "This page cannot be found. Its coordinates may have been buried in a 2,000-page disclosure filing.",
      icon: DollarSign,
    };
  }

  if (pathname.match(/^\/elections\/.+/)) {
    return {
      heading: "Election Page Not Found",
      message:
        "This page has been indefinitely postponed due to a recount. Check back after the hanging chads are resolved.",
      icon: Vote,
    };
  }

  if (pathname.match(/^\/polling-places\/.+/)) {
    return {
      heading: "Polling Place Not Found",
      message:
        "This page is at large. Last seen near a middle school gymnasium with confusing signage.",
      icon: MapPin,
    };
  }

  if (pathname === "/compare" || pathname.startsWith("/compare?")) {
    return {
      heading: "Comparison Not Found",
      message:
        "One of these candidates called a filibuster on this page. It cannot be found.",
      icon: GitCompare,
    };
  }

  if (pathname.startsWith("/api/")) {
    return {
      heading: "API Endpoint Not Found",
      message:
        "This endpoint does not exist. It may have been term-limited out of the API.",
      icon: Terminal,
    };
  }

  return DEFAULT_CONTENT;
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export default function ContextualNotFound() {
  const pathname = usePathname() ?? "";
  const content = matchContent(pathname);
  const Icon = content.icon;

  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-gray-50 px-4 relative overflow-hidden">
      {/* Decorative watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <Landmark
          className="text-[#1B2A4A] opacity-[0.03]"
          size={400}
          strokeWidth={0.5}
        />
      </div>

      <div className="relative max-w-md w-full text-center">
        {/* Large 404 badge */}
        <div className="mb-4">
          <span
            className="text-7xl sm:text-8xl font-black text-[#1B2A4A]/10 select-none"
            aria-hidden="true"
          >
            404
          </span>
        </div>

        {/* Contextual icon */}
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#1B2A4A]/10">
          <Icon className="h-8 w-8 text-[#1B2A4A]" aria-hidden="true" />
        </div>

        {/* Heading — serif for trust/authority */}
        <h1
          className="text-2xl sm:text-3xl font-bold text-[#1B2A4A] mb-3"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {content.heading}
        </h1>

        {/* Joke message */}
        <p className="text-gray-600 mb-8 leading-relaxed text-base">
          {content.message}
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 bg-[#1B2A4A] text-white font-semibold px-6 py-3 rounded-lg hover:bg-[#2D4066] transition-colors w-full sm:w-auto no-underline"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            Back to Homepage
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 bg-white text-[#1B2A4A] font-semibold px-6 py-3 rounded-lg ring-1 ring-gray-200 hover:bg-gray-50 transition-colors w-full sm:w-auto no-underline"
            onClick={(e) => {
              // Scroll to the US map section on the homepage
              const target = document.getElementById("select-state");
              if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: "smooth" });
              }
            }}
          >
            <Map className="h-4 w-4" aria-hidden="true" />
            Browse by State
          </Link>
        </div>
      </div>
    </div>
  );
}
