"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  X,
  Home,
  FileText,
  Vote,
  MapPin,
  Info,
  ChevronRight,
  Building2,
} from "lucide-react";
import { useUserState } from "@/hooks/useUserState";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface NavLink {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  description: string;
}

interface NavigationProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─────────────────────────────────────────────
// Nav links definition
// ─────────────────────────────────────────────

const NAV_LINKS: NavLink[] = [
  {
    href: "/",
    label: "Home",
    icon: Home,
    description: "Overview & latest civic news",
  },
  {
    href: "/bills",
    label: "Bills",
    icon: FileText,
    description: "Track federal & state legislation",
  },
  {
    href: "/elections",
    label: "Elections",
    icon: Vote,
    description: "Upcoming elections & candidates",
  },
  {
    href: "/local",
    label: "Local",
    icon: Building2,
    description: "City council meetings & local action",
  },
  {
    href: "/voter-info",
    label: "Voter Info",
    icon: MapPin,
    description: "Registration, polling places & deadlines",
  },
  {
    href: "/about",
    label: "About",
    icon: Info,
    description: "Our mission & data sources",
  },
];

/** Paths that need `/state/{abbr}` prepended */
const STATE_PATHS = new Set(["/bills", "/elections", "/voter-info"]);

// ─────────────────────────────────────────────
// Drawer animation variants
// ─────────────────────────────────────────────

const drawerVariants: Variants = {
  hidden: { x: "100%", opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { type: "tween" as const, duration: 0.28, ease: "easeOut" },
  },
  exit: {
    x: "100%",
    opacity: 0,
    transition: { type: "tween" as const, duration: 0.22, ease: "easeIn" },
  },
};

const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

const itemVariants: Variants = {
  hidden: { x: 20, opacity: 0 },
  visible: (i: number) => ({
    x: 0,
    opacity: 1,
    transition: { delay: i * 0.06 + 0.1, duration: 0.22, ease: "easeOut" as const },
  }),
};

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export default function Navigation({ isOpen, onClose }: NavigationProps) {
  const pathname = usePathname();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const { userState } = useUserState();

  /** Resolve a nav link href — prepend `/state/{abbr}` for state-scoped pages */
  const resolveHref = (href: string) => {
    if (!STATE_PATHS.has(href)) return href;
    return userState ? `/state/${userState}${href}` : "/#select-state";
  };

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  // Focus close button when drawer opens; restore focus when closed
  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Close drawer on route change
  useEffect(() => {
    onClose();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="nav-backdrop"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer panel */}
          <motion.nav
            key="nav-drawer"
            variants={drawerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
            className="fixed top-0 right-0 z-50 h-full w-80 max-w-[90vw] flex flex-col
                       bg-[#1B2A4A] shadow-2xl"
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
              <span
                className="font-serif font-bold text-white text-lg tracking-tight"
                aria-hidden="true"
              >
                Informed<span className="text-[#D69E2E]">Voter</span>
              </span>
              <button
                ref={closeButtonRef}
                onClick={onClose}
                aria-label="Close navigation menu"
                className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10
                           transition-colors focus-visible:outline-none focus-visible:ring-2
                           focus-visible:ring-white/50"
              >
                <X size={20} />
              </button>
            </div>

            {/* Nav links */}
            <ul className="flex-1 overflow-y-auto py-4 px-3" role="list">
              {NAV_LINKS.map((link, i) => {
                const fullHref = resolveHref(link.href);
                const isActive =
                  link.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(fullHref) || pathname.endsWith(link.href);
                const Icon = link.icon;

                return (
                  <motion.li
                    key={link.href}
                    custom={i}
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <Link
                      href={fullHref}
                      className={`flex items-center gap-4 px-4 py-3.5 rounded-xl mb-1
                                  transition-all duration-150 group
                                  ${
                                    isActive
                                      ? "bg-white/15 text-white"
                                      : "text-white/75 hover:bg-white/10 hover:text-white"
                                  }`}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <span
                        className={`flex-shrink-0 p-2 rounded-lg transition-colors
                                    ${
                                      isActive
                                        ? "bg-white/20 text-white"
                                        : "bg-white/5 text-white/60 group-hover:bg-white/15 group-hover:text-white"
                                    }`}
                      >
                        <Icon size={18} />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block font-semibold text-sm leading-tight">
                          {link.label}
                        </span>
                        <span className="block text-xs text-white/50 mt-0.5 leading-tight">
                          {link.description}
                        </span>
                      </span>
                      <ChevronRight
                        size={16}
                        className="flex-shrink-0 text-white/30 group-hover:text-white/60
                                   transition-colors"
                      />
                    </Link>
                  </motion.li>
                );
              })}
            </ul>

            {/* Footer note */}
            <div className="px-6 py-4 border-t border-white/10">
              <p className="text-xs text-white/40 leading-relaxed text-center">
                Nonpartisan &middot; Independent &middot; Fact-based
              </p>
            </div>
          </motion.nav>
        </>
      )}
    </AnimatePresence>
  );
}
