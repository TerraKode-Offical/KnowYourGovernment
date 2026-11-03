"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Landmark, Menu } from "lucide-react";
import Navigation from "./Navigation";
import StateSelector from "@/components/ui/StateSelector";
import { useUserState } from "@/hooks/useUserState";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface NavItem {
  href: string;
  label: string;
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  { href: "/",               label: "Home"        },
  { href: "/bills",          label: "Bills"       },
  { href: "/elections",      label: "Elections"   },
  { href: "/pac-recipients", label: "PAC Tracker" },
  { href: "/local",          label: "Local"       },
  { href: "/voter-info",     label: "Voter Info"  },
  { href: "/about",          label: "About"       },
];

/** Paths that need `/state/{abbr}` prepended */
const STATE_PATHS = new Set(["/bills", "/elections", "/voter-info"]);

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export default function Header() {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { userState } = useUserState();

  /** Resolve a nav item href — prepend `/state/{abbr}` for state-scoped pages,
   *  or link to the homepage map if no state is selected */
  const resolveHref = (href: string) => {
    if (!STATE_PATHS.has(href)) return href;
    return userState ? `/state/${userState}${href}` : "/#select-state";
  };

  // Add shadow when page is scrolled
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        className={`sticky top-0 z-30 w-full transition-shadow duration-200
                    bg-[#1B2A4A] text-white
                    ${scrolled ? "shadow-[0_4px_24px_0_rgb(27_42_74_/_0.35)]" : ""}`}
        role="banner"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* ── Logo ── */}
            <Link
              href="/"
              className="flex items-center gap-2.5 group flex-shrink-0 focus-visible:outline-none
                         focus-visible:ring-2 focus-visible:ring-white/50 rounded-lg px-1"
              aria-label="InformedVoter — Home"
            >
              <span
                className="flex items-center justify-center w-8 h-8 rounded-lg
                           bg-white/15 group-hover:bg-white/25 transition-colors"
                aria-hidden="true"
              >
                <Landmark size={18} className="text-white" />
              </span>
              <span className="font-serif font-bold text-white text-lg leading-none tracking-tight">
                Informed<span className="text-[#D69E2E]">Voter</span>
              </span>
              <span className="hidden sm:inline text-[10px] text-white/40 font-sans font-medium uppercase tracking-widest leading-none -ml-0.5">
                Gov in Plain English
              </span>
            </Link>

            {/* ── Desktop nav ── */}
            <nav
              className="hidden md:flex items-center gap-1"
              aria-label="Main navigation"
            >
              {NAV_ITEMS.map((item) => {
                const fullHref = resolveHref(item.href);
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(fullHref) || pathname.endsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={fullHref}
                    aria-current={isActive ? "page" : undefined}
                    className={`relative px-4 py-2 rounded-lg text-sm font-medium
                                transition-colors duration-150 focus-visible:outline-none
                                focus-visible:ring-2 focus-visible:ring-white/50
                                ${isActive
                                  ? "text-white"
                                  : "text-white/70 hover:text-white hover:bg-white/10"}`}
                  >
                    {item.label}
                    {/* Active underline indicator */}
                    {isActive && (
                      <motion.span
                        layoutId="header-active-pill"
                        className="absolute inset-0 rounded-lg bg-white/15"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* ── Right side actions ── */}
            <div className="flex items-center gap-2">
              {/* State selector — hidden on very small screens */}
              <div className="hidden sm:block">
                <StateSelector />
              </div>

              {/* Mobile menu trigger */}
              <button
                onClick={() => setMobileNavOpen(true)}
                aria-label="Open navigation menu"
                aria-expanded={mobileNavOpen}
                aria-controls="mobile-nav-drawer"
                className="md:hidden p-2 rounded-lg text-white/70 hover:text-white
                           hover:bg-white/10 transition-colors focus-visible:outline-none
                           focus-visible:ring-2 focus-visible:ring-white/50"
              >
                <Menu size={22} />
              </button>
            </div>

          </div>

          {/* State selector row on mobile (sm and below) */}
          <div className="sm:hidden pb-3">
            <StateSelector />
          </div>
        </div>

        {/* Thin accent line at bottom */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </header>

      {/* Mobile navigation drawer */}
      <Navigation
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />
    </>
  );
}
