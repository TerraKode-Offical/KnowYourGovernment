"use client";

import { useState, useCallback } from "react";
import { Mail, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import DemographicSurveyModal from "@/components/features/DemographicSurveyModal";
import { apiErrorMessage } from "@/lib/api-client";

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────

interface SubscribeFormProps {
  stateAbbr: string;
  stateName?: string;
  heading?: string;
  subtext?: string;
  variant?: "default" | "compact" | "dark";
  /** When false, transactional email is not configured in this deployment. */
  disabled?: boolean;
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

type FormState = "idle" | "submitting" | "success" | "error";

export default function SubscribeForm({
  stateAbbr,
  stateName,
  heading,
  subtext,
  variant = "default",
  disabled = false,
}: SubscribeFormProps) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<FormState>("idle");
  const [message, setMessage] = useState("");
  const [profileToken, setProfileToken] = useState<string | null>(null);
  const [showSurvey, setShowSurvey] = useState(false);

  const displayName = stateName ?? stateAbbr;
  const defaultHeading = heading ?? `Get ${displayName} updates in your inbox`;
  const defaultSubtext =
    subtext ??
    "Bills, election deadlines, and Supreme Court decisions — in plain English. No spam, unsubscribe anytime.";

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = email.trim();
      if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        setState("error");
        setMessage("Please enter a valid email address.");
        return;
      }

      setState("submitting");
      try {
        const res = await fetch("/api/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: trimmed, stateAbbr }),
        });
        const data = await res.json();

        if (!res.ok) {
          setState("error");
          setMessage(apiErrorMessage(data, "Something went wrong."));
          return;
        }

        setState("success");
        setMessage(data.message ?? "Check your email to confirm!");
        if (data.profileToken) {
          setProfileToken(data.profileToken);
          setShowSurvey(true);
        }
      } catch {
        setState("error");
        setMessage("Network error. Please try again.");
      }
    },
    [email, stateAbbr]
  );

  const isDark = variant === "dark";
  const isCompact = variant === "compact";

  // ── Email provider not configured ──
  // Never invite an address we cannot confirm; say so plainly instead.
  if (disabled) {
    return (
      <div
        className={`rounded-xl p-5 text-sm ${
          isDark
            ? "bg-white/5 ring-1 ring-white/10 text-white/70"
            : "bg-blue-50/50 border border-blue-100 text-gray-600"
        }`}
        role="status"
      >
        <p className="font-semibold mb-1">Email updates are coming soon</p>
        <p>
          Email subscriptions are temporarily unavailable. Follow your state page
          for the latest bills, deadlines, and rulings in the meantime.
        </p>
      </div>
    );
  }

  // ── Success state ──
  if (state === "success") {
    return (
      <>
        <div
          className={`flex items-center gap-3 rounded-lg p-4 ${
            isDark ? "bg-green-500/10 text-green-300" : "bg-green-50 text-green-700"
          }`}
          role="status"
          aria-live="polite"
        >
          <CheckCircle size={18} className="flex-shrink-0" />
          <p className="text-sm font-medium">{message}</p>
        </div>
        {showSurvey && profileToken && (
          <DemographicSurveyModal
            profileToken={profileToken}
            onClose={() => setShowSurvey(false)}
          />
        )}
      </>
    );
  }

  // ── Compact variant ──
  if (isCompact) {
    return (
      <form onSubmit={handleSubmit} className="flex items-center gap-2 w-full">
        <div className="relative flex-1">
          <Mail
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setState("idle"); }}
            placeholder="you@email.com"
            aria-label="Email address"
            className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg border outline-none transition-colors ${
              isDark
                ? "bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white/40"
                : "bg-white border-gray-200 text-gray-900 focus:border-[#1B2A4A]/40"
            } ${state === "error" ? "border-red-400" : ""}`}
          />
        </div>
        <button
          type="submit"
          disabled={state === "submitting"}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
            isDark
              ? "bg-white text-[#1B2A4A] hover:bg-white/90"
              : "bg-[#1B2A4A] text-white hover:bg-[#2a3f6a]"
          } disabled:opacity-50`}
        >
          {state === "submitting" ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            "Subscribe"
          )}
        </button>
      </form>
    );
  }

  // ── Default variant ──
  return (
    <div
      className={`rounded-xl p-6 ${
        isDark
          ? "bg-white/5 ring-1 ring-white/10"
          : "bg-blue-50/50 border border-blue-100"
      }`}
    >
      <div className="flex items-start gap-3 mb-4">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            isDark ? "bg-blue-500/20" : "bg-[#1B2A4A]/10"
          }`}
        >
          <Mail size={18} className={isDark ? "text-blue-400" : "text-[#1B2A4A]"} />
        </div>
        <div>
          <h3
            className={`font-semibold text-base leading-snug ${
              isDark ? "text-white" : "text-[#1B2A4A]"
            }`}
          >
            {defaultHeading}
          </h3>
          <p
            className={`text-sm mt-1 leading-relaxed ${
              isDark ? "text-white/60" : "text-gray-500"
            }`}
          >
            {defaultSubtext}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Mail
            size={14}
            className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${
              isDark ? "text-white/40" : "text-gray-400"
            }`}
          />
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setState("idle"); }}
            placeholder="you@email.com"
            aria-label="Email address"
            className={`w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border outline-none transition-colors ${
              isDark
                ? "bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white/40"
                : "bg-white border-gray-200 text-gray-900 focus:border-[#1B2A4A]/40 focus:ring-1 focus:ring-[#1B2A4A]/20"
            } ${state === "error" ? "border-red-400" : ""}`}
          />
        </div>
        <button
          type="submit"
          disabled={state === "submitting"}
          className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
            isDark
              ? "bg-white text-[#1B2A4A] hover:bg-white/90"
              : "bg-[#1B2A4A] text-white hover:bg-[#2a3f6a]"
          } disabled:opacity-50`}
        >
          {state === "submitting" ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" /> Subscribing...
            </span>
          ) : (
            "Get Updates"
          )}
        </button>
      </form>

      {state === "error" && (
        <div
          className="flex items-center gap-2 mt-3 text-sm text-red-600"
          role="alert"
          aria-live="polite"
        >
          <AlertCircle size={14} />
          {message}
        </div>
      )}
    </div>
  );
}
