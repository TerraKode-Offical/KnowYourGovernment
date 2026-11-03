"use client";

import { useState } from "react";
import { Search, MapPin, Loader2, ExternalLink, AlertCircle, Info } from "lucide-react";
import { apiErrorMessage } from "@/lib/api-client";

// ─────────────────────────────────────────────
// Types matching the /api/polling-places response
// (We reuse the polling-places endpoint since the
//  Google Civic API voterInfoQuery also returns
//  election and contest information.)
// ─────────────────────────────────────────────

interface PollingLocation {
  name: string | null;
  address: string | null;
  pollingHours: string | null;
}

interface PollingPlacesResponse {
  election: { name?: string; electionDay?: string } | null;
  pollingLocations: PollingLocation[];
  earlyVoteSites: PollingLocation[];
  dropOffLocations: PollingLocation[];
  notice?: string;
  error?: string;
}

export default function BallotAddressInput() {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [election, setElection] = useState<{ name?: string; electionDay?: string } | null>(null);
  const [hasLocations, setHasLocations] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address.trim()) return;
    setLoading(true);
    setError(null);
    setNotice(null);
    setElection(null);
    setHasLocations(false);
    setSearched(false);

    try {
      const res = await fetch(
        "/api/polling-places?address=" + encodeURIComponent(address.trim())
      );
      const json: PollingPlacesResponse = await res.json();

      if (!res.ok) {
        setError(apiErrorMessage(json, "Failed to look up ballot information. Please try again."));
        return;
      }

      setSearched(true);

      if (json.notice) {
        setNotice(json.notice);
      }

      if (json.election) {
        setElection(json.election);
      }

      const totalLocations =
        (json.pollingLocations?.length ?? 0) +
        (json.earlyVoteSites?.length ?? 0) +
        (json.dropOffLocations?.length ?? 0);

      setHasLocations(totalLocations > 0);
    } catch {
      setError("Unable to reach the server. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <form onSubmit={handleSubmit} className="flex gap-3 flex-col sm:flex-row mb-4">
        <div className="relative flex-1">
          <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter your home address..."
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
              Loading...
            </>
          ) : (
            <>
              <Search size={14} />
              Check My Ballot
            </>
          )}
        </button>
      </form>

      {/* Error */}
      {error && !loading && (
        <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800 mb-4">
          <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Results after search */}
      {searched && !loading && !error ? (
        <div>
          {/* Election info found */}
          {election ? (
            <div className="space-y-3">
              <div className="flex items-start gap-2.5 p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
                <Info size={15} className="text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">{election.name}</p>
                  {election.electionDay && (
                    <p className="text-xs text-blue-600 mt-0.5">Election Day: {election.electionDay}</p>
                  )}
                </div>
              </div>

              {hasLocations && (
                <p className="text-sm text-gray-600">
                  Polling locations were found for your address. Visit the{" "}
                  <strong>Polling Places</strong> section on this page for full details.
                </p>
              )}

              <p className="text-xs text-gray-400 mt-3">
                For your complete, official ballot including all contests and propositions, visit{" "}
                <a
                  href="https://www.vote.org/whats-on-my-ballot/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#1B2A4A] underline hover:no-underline"
                >
                  vote.org <ExternalLink size={10} className="inline" />
                </a>{" "}
                or check with your{" "}
                <a
                  href="https://www.usa.gov/election-office"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#1B2A4A] underline hover:no-underline"
                >
                  local election office <ExternalLink size={10} className="inline" />
                </a>
                .
              </p>
            </div>
          ) : (
            /* No election / notice */
            <div className="space-y-3">
              {notice ? (
                <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                  <Info size={15} className="text-amber-500 shrink-0 mt-0.5" />
                  <p>{notice}</p>
                </div>
              ) : (
                <div className="flex items-start gap-2.5 p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600">
                  <Info size={15} className="text-gray-400 shrink-0 mt-0.5" />
                  <p>
                    No upcoming election information is available for this address right now.
                    Ballot data is typically available a few weeks before an election.
                  </p>
                </div>
              )}
              <p className="text-xs text-gray-400">
                You can check{" "}
                <a
                  href="https://www.vote.org/whats-on-my-ballot/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#1B2A4A] underline hover:no-underline"
                >
                  vote.org <ExternalLink size={10} className="inline" />
                </a>{" "}
                for your official ballot information.
              </p>
            </div>
          )}
        </div>
      ) : !loading && !error && (
        /* Initial state before any search */
        <p className="text-xs text-gray-400">
          Enter your address to check for upcoming election and ballot information.
          Your address is used only for the lookup and is never stored.{" "}
          <a
            href="https://www.vote.org/whats-on-my-ballot/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#1B2A4A] underline hover:no-underline"
          >
            Use vote.org instead <ExternalLink size={10} className="inline" />
          </a>
        </p>
      )}
    </div>
  );
}
