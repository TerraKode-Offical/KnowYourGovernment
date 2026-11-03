"use client";

import { useState } from "react";
import { Search, MapPin, Loader2, AlertCircle, Info } from "lucide-react";
import Link from "next/link";
import { apiErrorMessage } from "@/lib/api-client";

// ─────────────────────────────────────────────
// Types matching /api/district-lookup response
// ─────────────────────────────────────────────

interface DistrictResult {
  office: string;
  district: string | null;
  representative: string;
  party: string | null;
}

interface DistrictLookupResponse {
  districts: DistrictResult[];
  normalizedAddress?: {
    line1?: string;
    city?: string;
    state?: string;
    zip?: string;
  } | null;
  notice?: string;
  error?: string;
}

export default function DistrictFinder() {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DistrictResult[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address.trim()) return;
    setLoading(true);
    setError(null);
    setNotice(null);
    setResults(null);

    try {
      const res = await fetch(
        "/api/district-lookup?address=" + encodeURIComponent(address.trim())
      );
      const json: DistrictLookupResponse = await res.json();

      if (!res.ok) {
        setError(apiErrorMessage(json, "Failed to look up your district. Please try again."));
        return;
      }

      if (json.notice) {
        setNotice(json.notice);
      }

      if (json.districts && json.districts.length > 0) {
        setResults(json.districts);
      } else if (!json.notice) {
        setNotice("No congressional district information found for this address. Try entering a full street address with city, state, and ZIP code.");
      }
    } catch {
      setError("Unable to reach the server. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <h2 className="text-lg font-bold text-[#1B2A4A] mb-1 flex items-center gap-2">
        <MapPin size={18} className="text-[#C53030]" />
        Find Your District
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        Enter your home address to find your congressional district and representative.
      </p>

      <form onSubmit={handleSubmit} className="flex gap-3 flex-col sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g., 123 Main St, Sacramento, CA 95814"
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]/30 focus:border-[#1B2A4A]/50"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !address.trim()}
          className="inline-flex items-center justify-center gap-2 bg-[#1B2A4A] text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-[#2D4066] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Looking up...
            </>
          ) : (
            "Find My District"
          )}
        </button>
      </form>

      {/* Error */}
      {error && !loading && (
        <div className="mt-4 flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Notice (not configured or no results) */}
      {notice && !results && !loading && !error && (
        <div className="mt-4 flex items-start gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <Info size={16} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p>{notice}</p>
            <p className="mt-2 text-xs">
              You can also browse representatives on your{" "}
              <Link href="/state" className="text-[#1B2A4A] underline hover:no-underline font-medium">
                state page
              </Link>
              .
            </p>
          </div>
        </div>
      )}

      {/* Results */}
      {results && results.length > 0 && !loading && (
        <div className="mt-4 space-y-2">
          {results.map((r, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 p-3.5 bg-green-50 border border-green-200 rounded-lg text-sm"
            >
              <MapPin size={16} className="text-green-600 shrink-0" />
              <p className="text-green-800">
                {r.district ? (
                  <>
                    You are in <strong>Congressional District {r.district}</strong>, represented by{" "}
                    <strong>{r.representative}</strong>
                    {r.party ? ` (${r.party})` : ""}.
                  </>
                ) : (
                  <>
                    Your representative is <strong>{r.representative}</strong>
                    {r.party ? ` (${r.party})` : ""}.
                  </>
                )}
              </p>
            </div>
          ))}
          <p className="text-xs text-gray-400 pt-1">
            Data provided by the Google Civic Information API.
          </p>
        </div>
      )}
    </div>
  );
}
