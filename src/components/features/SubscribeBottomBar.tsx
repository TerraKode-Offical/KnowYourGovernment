"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Mail, Loader2, CheckCircle } from "lucide-react";
import { useUserState } from "@/hooks/useUserState";
import DemographicSurveyModal from "@/components/features/DemographicSurveyModal";
import { apiErrorMessage } from "@/lib/api-client";

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const COOKIE_NAME = "subscribe-bar-dismissed";
const DISMISS_DAYS = 30;
const SHOW_DELAY_MS = 30_000;
const SCROLL_THRESHOLD = 0.5;

// ─────────────────────────────────────────────
// State name lookup
// ─────────────────────────────────────────────

const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi",
  MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire",
  NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina",
  ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
  RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee",
  TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington",
  WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming", DC: "District of Columbia",
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function isDismissed(): boolean {
  if (typeof document === "undefined") return true;
  return document.cookie.includes(`${COOKIE_NAME}=1`);
}

function setDismissed(): void {
  if (typeof document === "undefined") return;
  const maxAge = DISMISS_DAYS * 24 * 60 * 60;
  document.cookie = `${COOKIE_NAME}=1; max-age=${maxAge}; path=/; SameSite=Lax`;
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

type BarState = "hidden" | "visible" | "submitting" | "success" | "dismissed";

export default function SubscribeBottomBar() {
  const { userState } = useUserState();
  const [barState, setBarState] = useState<BarState>("hidden");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [profileToken, setProfileToken] = useState<string | null>(null);
  const [showSurvey, setShowSurvey] = useState(false);

  // Show after delay or scroll
  useEffect(() => {
    if (isDismissed()) return;

    let shown = false;
    const show = () => {
      if (!shown) {
        shown = true;
        setBarState("visible");
      }
    };

    const timer = setTimeout(show, SHOW_DELAY_MS);

    const handleScroll = () => {
      const scrollPct =
        window.scrollY / (document.body.scrollHeight - window.innerHeight);
      if (scrollPct >= SCROLL_THRESHOLD) show();
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const dismiss = useCallback(() => {
    setDismissed();
    setBarState("dismissed");
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = email.trim();
      if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        setError("Please enter a valid email.");
        return;
      }

      setBarState("submitting");
      setError("");

      try {
        const res = await fetch("/api/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: trimmed,
            stateAbbr: userState ?? "DC",
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(apiErrorMessage(data, "Something went wrong."));
          setBarState("visible");
          return;
        }

        setBarState("success");
        setDismissed(); // Don't show again
        const data = await res.json();
        if (data.profileToken) {
          setProfileToken(data.profileToken);
          setShowSurvey(true);
        }
        if (!data.profileToken) {
          setTimeout(() => setBarState("dismissed"), 4000);
        }
      } catch {
        setError("Network error. Please try again.");
        setBarState("visible");
      }
    },
    [email, userState]
  );

  if (barState === "hidden" || barState === "dismissed") {
    // Still render the survey modal if it's open even after the bar dismisses
    if (showSurvey && profileToken) {
      return (
        <DemographicSurveyModal
          profileToken={profileToken}
          onClose={() => {
            setShowSurvey(false);
            setBarState("dismissed");
          }}
        />
      );
    }
    return null;
  }

  const stateName = userState ? STATE_NAMES[userState] : null;

  return (
    <>
      <div
        className="fixed bottom-0 left-0 right-0 z-40 bg-[#1B2A4A] border-t border-white/10
                   shadow-[0_-4px_20px_rgba(0,0,0,0.3)] animate-in slide-in-from-bottom duration-300"
        role="complementary"
        aria-label="Email subscription"
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3">
          {barState === "success" ? (
            <div className="flex items-center justify-center gap-2 text-green-300 text-sm font-medium">
              <CheckCircle size={16} />
              Check your email to confirm!
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="flex flex-col sm:flex-row items-center gap-3"
            >
              <p className="text-white/80 text-sm font-medium flex-shrink-0">
                <Mail size={14} className="inline -mt-0.5 mr-1.5 text-blue-400" />
                {stateName
                  ? `Get weekly ${stateName} updates`
                  : "Get weekly civic updates"}
                <span className="text-white/40 hidden sm:inline">
                  {" "}— no spam, unsubscribe anytime
                </span>
              </p>

              <div className="flex items-center gap-2 w-full sm:w-auto sm:flex-1 sm:max-w-sm">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  placeholder="you@email.com"
                  aria-label="Email address"
                  className="flex-1 px-3 py-2 text-sm bg-white/10 border border-white/20 rounded-lg
                             text-white placeholder:text-white/40 outline-none focus:border-white/40"
                />
                <button
                  type="submit"
                  disabled={barState === "submitting"}
                  className="px-4 py-2 text-sm font-semibold bg-white text-[#1B2A4A] rounded-lg
                             hover:bg-white/90 transition-colors whitespace-nowrap disabled:opacity-50"
                >
                  {barState === "submitting" ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    "Subscribe"
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={dismiss}
                aria-label="Dismiss subscription bar"
                className="absolute right-3 top-1/2 -translate-y-1/2 sm:relative sm:right-auto sm:top-auto
                           sm:translate-y-0 p-1.5 text-white/40 hover:text-white/70 transition-colors"
              >
                <X size={16} />
              </button>
            </form>
          )}

          {error && (
            <p className="text-red-400 text-xs mt-1 text-center sm:text-left">
              {error}
            </p>
          )}
        </div>
      </div>

      {showSurvey && profileToken && (
        <DemographicSurveyModal
          profileToken={profileToken}
          onClose={() => {
            setShowSurvey(false);
            setBarState("dismissed");
          }}
        />
      )}
    </>
  );
}
