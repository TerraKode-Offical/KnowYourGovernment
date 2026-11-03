"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from "lucide-react";

// ─────────────────────────────────────────────
// Root Error Boundary
//
// Catches React rendering errors, hydration failures,
// chunk load errors, and client-side exceptions.
// NEVER exposes technical details to users in production.
// ─────────────────────────────────────────────

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const IS_DEV = process.env.NODE_ENV === "development";

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Log the error internally for debugging
    // eslint-disable-next-line no-console
    console.error("[Error Boundary] Caught error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-gray-50 px-4 relative overflow-hidden">
      {/* Decorative watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <AlertTriangle
          className="text-[#1B2A4A] opacity-[0.03]"
          size={400}
          strokeWidth={0.5}
        />
      </div>

      <div className="relative max-w-md w-full text-center">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#1B2A4A]/10">
          <AlertTriangle className="h-8 w-8 text-[#1B2A4A]" aria-hidden="true" />
        </div>

        {/* Heading — serif for trust/authority */}
        <h1
          className="text-2xl sm:text-3xl font-bold text-[#1B2A4A] mb-3"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Something Went Wrong
        </h1>

        {/* Friendly message */}
        <p className="text-gray-600 mb-8 leading-relaxed text-base">
          We&apos;re experiencing a technical issue on our end. It&apos;s not you
          — it&apos;s us. Probably a committee filibuster in our server room. Try
          refreshing the page or come back in a few minutes.
        </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 bg-[#1B2A4A] text-white font-semibold px-6 py-3 rounded-lg hover:bg-[#2D4066] transition-colors w-full sm:w-auto cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh Page
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 bg-white text-[#1B2A4A] font-semibold px-6 py-3 rounded-lg ring-1 ring-gray-200 hover:bg-gray-50 transition-colors w-full sm:w-auto no-underline"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            Go to Homepage
          </Link>
        </div>

        {/* Error digest (safe, non-technical ID for support) */}
        {error.digest && (
          <p className="mt-6 text-xs text-gray-400 font-mono">
            Error ID: {error.digest}
          </p>
        )}

        {/* Development-only technical details toggle */}
        {IS_DEV && (
          <div className="mt-8 text-left">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer mx-auto"
            >
              {showDetails ? (
                <ChevronUp className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              )}
              Show Technical Details (Dev Only)
            </button>

            {showDetails && (
              <div className="mt-3 p-4 bg-gray-100 rounded-lg overflow-auto max-h-96">
                <p className="text-xs font-mono text-gray-700 mb-2">
                  <strong>{error.name}:</strong> {error.message}
                </p>
                {error.stack && (
                  <pre className="text-xs font-mono text-gray-600 whitespace-pre-wrap break-all">
                    {error.stack}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
