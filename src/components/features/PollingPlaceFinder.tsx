"use client";

import { useState } from "react";
import { Search, MapPin, Loader2, Clock, ChevronRight, AlertCircle, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiErrorMessage } from "@/lib/api-client";

// ─────────────────────────────────────────────
// Types matching the /api/polling-places response
// ─────────────────────────────────────────────

interface PollingLocation {
  name: string | null;
  address: string | null;
  pollingHours: string | null;
  startDate: string | null;
  endDate: string | null;
  sources: Array<{ name?: string; official?: boolean }>;
}

interface PollingPlacesResponse {
  election: { name?: string; electionDay?: string } | null;
  pollingLocations: PollingLocation[];
  earlyVoteSites: PollingLocation[];
  dropOffLocations: PollingLocation[];
  notice?: string;
  error?: string;
}

export default function PollingPlaceFinder() {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PollingPlacesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!address.trim()) return;
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch(
        "/api/polling-places?address=" + encodeURIComponent(address.trim())
      );
      const json = await res.json();

      if (!res.ok) {
        setError(apiErrorMessage(json, "Failed to look up polling places. Please try again."));
        return;
      }

      setData(json);
    } catch {
      setError("Unable to reach the server. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  // Build a unified list of locations with type labels
  const allLocations: Array<PollingLocation & { type: string; typeColor: string; earlyVoting: boolean; dropBox: boolean }> = [];

  if (data) {
    for (const loc of data.pollingLocations) {
      allLocations.push({ ...loc, type: "Polling Place", typeColor: "bg-blue-100 text-blue-800", earlyVoting: false, dropBox: false });
    }
    for (const loc of data.earlyVoteSites) {
      allLocations.push({ ...loc, type: "Early Vote Site", typeColor: "bg-emerald-100 text-emerald-800", earlyVoting: true, dropBox: false });
    }
    for (const loc of data.dropOffLocations) {
      allLocations.push({ ...loc, type: "Drop-Off Location", typeColor: "bg-purple-100 text-purple-800", earlyVoting: false, dropBox: true });
    }
  }

  const hasResults = allLocations.length > 0;
  const hasNotice = data?.notice && !hasResults;

  return (
    <div className="space-y-6">
      {/* Search form */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-[#1B2A4A] mb-4">Find Polling Places Near You</h2>
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
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
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading || !address.trim()}
              className="inline-flex items-center gap-2 bg-[#1B2A4A] text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-[#2D4066] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              {loading ? (
                <><Loader2 size={14} className="animate-spin" /> Searching...</>
              ) : (
                <><Search size={14} /> Search</>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Error state */}
      <AnimatePresence>
        {error && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800"
          >
            <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <p>{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notice (no results / not configured) */}
      <AnimatePresence>
        {hasNotice && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800"
          >
            <Info size={16} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p>{data?.notice}</p>
              {data?.election && (
                <p className="mt-1 text-xs text-amber-600">
                  Election: {data.election.name}{data.election.electionDay ? ` (${data.election.electionDay})` : ""}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence>
        {hasResults && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="space-y-4"
          >
            {/* Election info */}
            {data?.election && (
              <div className="flex items-start gap-2.5 p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
                <Info size={15} className="text-blue-500 shrink-0 mt-0.5" />
                <p>
                  <strong>{data.election.name}</strong>
                  {data.election.electionDay ? ` — ${data.election.electionDay}` : ""}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">
                Found <strong className="text-[#1B2A4A]">{allLocations.length} polling location{allLocations.length !== 1 ? "s" : ""}</strong> near you
              </p>
            </div>

            {allLocations.map((place, idx) => (
              <div
                key={`${place.type}-${idx}`}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    {/* Icon */}
                    <div className="w-12 h-12 rounded-xl bg-[#1B2A4A]/5 flex items-center justify-center shrink-0">
                      <MapPin size={22} className="text-[#1B2A4A]" />
                    </div>

                    <div className="flex-1">
                      <div className="flex flex-wrap items-start gap-2 mb-1">
                        <h3 className="font-bold text-[#1B2A4A] text-base leading-snug">
                          {place.name || "Polling Location"}
                        </h3>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${place.typeColor}`}>
                          {place.type}
                        </span>
                      </div>

                      {place.address && (
                        <p className="text-sm text-gray-500 mb-3">{place.address}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        {place.pollingHours && (
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <Clock size={13} className="text-gray-400" />
                            {place.pollingHours}
                          </div>
                        )}
                        {place.startDate && place.endDate && (
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <Clock size={13} className="text-gray-400" />
                            {place.startDate} &ndash; {place.endDate}
                          </div>
                        )}
                      </div>

                      {/* Badges */}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {place.earlyVoting && (
                          <span className="text-[11px] font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                            Early Voting
                          </span>
                        )}
                        {place.dropBox && (
                          <span className="text-[11px] font-medium bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                            Ballot Drop Box
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Get directions */}
                    {place.address && (
                      <a
                        href={`https://maps.google.com/?q=${encodeURIComponent(place.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 bg-[#1B2A4A] text-white text-xs font-semibold px-4 py-2.5 rounded-lg hover:bg-[#2D4066] transition-colors shrink-0"
                      >
                        Get Directions <ChevronRight size={12} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <p className="text-xs text-gray-400 text-center pt-2">
              Polling place data is provided by the Google Civic Information API for informational purposes. Verify with your county elections office.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Searched but found nothing and no notice */}
      <AnimatePresence>
        {data && !hasResults && !hasNotice && !loading && !error && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="flex items-start gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600"
          >
            <Info size={16} className="text-gray-400 shrink-0 mt-0.5" />
            <p>
              No polling locations found for this address. This may mean there is no upcoming election, or data is not yet available for your area.
              Check back closer to an election date.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
