"use client";

import { useState, useEffect, useCallback } from "react";

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

// Renamed from "user-state" (2026-04) to wipe any stale auto-detected values
// from earlier builds that included IP-based geolocation. Everyone re-selects
// once; after that the cookie persists across all navigation.
const COOKIE_NAME = "selected-state";
/** Cookie max-age in seconds — 1 year */
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

// ─────────────────────────────────────────────
// Cookie helpers (browser-safe)
// ─────────────────────────────────────────────

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

function writeCookie(name: string, value: string, maxAge: number): void {
  if (typeof document === "undefined") return;
  const isHttps =
    typeof window !== "undefined" && window.location.protocol === "https:";
  document.cookie = [
    `${name}=${encodeURIComponent(value)}`,
    `max-age=${maxAge}`,
    "path=/",
    "SameSite=Lax",
    ...(isHttps ? ["Secure"] : []),
  ].join("; ");
}

// ─────────────────────────────────────────────
// Hook return type
// ─────────────────────────────────────────────

export interface UseUserStateReturn {
  /** Two-letter state abbreviation, or null if user has not selected one */
  userState: string | null;
  /** Update the user's state, persisting to cookie */
  setUserState: (abbr: string) => void;
  /**
   * True during the brief post-hydration window before the cookie is read.
   * Components that gate navigation on userState should render neutral UI
   * during this window to avoid flashing "select your state" for a user
   * who already has one saved.
   */
  isHydrating: boolean;
}

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────

// The hook deliberately starts in a null / hydrating state on both server
// and client so hydration matches exactly. The cookie is read in useEffect
// after mount. This is the ONLY place the cookie is read or written —
// there is NO IP-based detection, NO server-side fallback, and NO default
// state. The cookie changes only when the user explicitly calls setUserState.
export function useUserState(): UseUserStateReturn {
  const [userState, _setUserState] = useState<string | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);

  // Read the cookie once on mount, then on every subsequent remount.
  // This is what makes the selection persist across navigation.
  useEffect(() => {
    const stored = readCookie(COOKIE_NAME)?.toUpperCase() ?? null;
    _setUserState(stored);
    setIsHydrating(false);
  }, []);

  const setUserState = useCallback((abbr: string) => {
    const normalized = abbr.toUpperCase();
    writeCookie(COOKIE_NAME, normalized, COOKIE_MAX_AGE);
    _setUserState(normalized);
  }, []);

  return { userState, setUserState, isHydrating };
}
