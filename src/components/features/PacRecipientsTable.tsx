"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Loader2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  DollarSign,
  Users,
  Search,
} from "lucide-react";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface Contribution {
  committeeName: string;
  committeeId: string;
  amount: number;
  date: string | null;
  fecUrl: string | null;
}

interface Recipient {
  candidateId: number;
  candidateName: string;
  party: string;
  state: string;
  stateName: string;
  officeType: string;
  district: string | null;
  photoUrl: string | null;
  totalAmount: number;
  contributionCount: number;
  contributions: Contribution[];
}

interface ApiResponse {
  success: boolean;
  data: {
    recipients: Recipient[];
    totalRecipients: number;
    totalAmount: number;
  };
  meta: { page: number; limit: number; total: number };
}

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────

interface PacRecipientsTableProps {
  /** One or more FEC committee IDs to aggregate contributions from */
  committeeIds: readonly string[];
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const CHAMBERS = [
  { value: "", label: "All Chambers" },
  { value: "senate", label: "Senate" },
  { value: "house", label: "House" },
];

const PARTIES = [
  { value: "", label: "All Parties" },
  { value: "Democrat", label: "Democrat" },
  { value: "Republican", label: "Republican" },
  { value: "Independent", label: "Independent" },
];

const currentYear = new Date().getFullYear();
const CYCLES = Array.from({ length: 5 }, (_, i) => {
  const year = currentYear - i * 2;
  return year % 2 === 0 ? year : year + 1;
});

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export default function PacRecipientsTable({ committeeIds }: PacRecipientsTableProps) {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [totalRecipients, setTotalRecipients] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [chamber, setChamber] = useState("");
  const [party, setParty] = useState("");
  const [cycle, setCycle] = useState(CYCLES[0]);
  const [nameSearch, setNameSearch] = useState("");
  const [sortBy, setSortBy] = useState("amount");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      committeeIds: committeeIds.join(","),
      cycle: String(cycle),
      sortBy,
      sortDir,
      page: String(page),
      limit: "50",
    });

    if (chamber) params.set("chamber", chamber);
    if (party) params.set("party", party);

    try {
      const res = await fetch(`/api/pac-recipients?${params}`);
      if (!res.ok) throw new Error("Failed to fetch data");
      const json: ApiResponse = await res.json();
      let filtered = json.data.recipients;
      if (nameSearch.trim()) {
        const q = nameSearch.toLowerCase();
        filtered = filtered.filter((r) => r.candidateName.toLowerCase().includes(q));
      }
      setRecipients(filtered);
      setTotalRecipients(json.data.totalRecipients);
      setTotalAmount(json.data.totalAmount);
    } catch {
      setError("Failed to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [committeeIds, chamber, party, cycle, sortBy, sortDir, page, nameSearch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSort = (col: string) => {
    if (sortBy === col) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortBy(col);
      setSortDir("desc");
    }
    setPage(1);
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);

  const SortIcon = ({ col }: { col: string }) => {
    if (sortBy !== col) return null;
    return sortDir === "desc" ? <ChevronDown size={14} /> : <ChevronUp size={14} />;
  };

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <Users size={14} /> Total Recipients
          </div>
          <p className="text-2xl font-bold text-[#1B2A4A]">
            {loading ? "—" : totalRecipients.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <DollarSign size={14} /> Total Contributed
          </div>
          <p className="text-2xl font-bold text-[#1B2A4A]">
            {loading ? "—" : formatCurrency(totalAmount)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <DollarSign size={14} /> Election Cycle
          </div>
          <p className="text-2xl font-bold text-[#1B2A4A]">{cycle - 1}–{cycle}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <select
          value={chamber}
          onChange={(e) => { setChamber(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:border-[#1B2A4A]/40"
        >
          {CHAMBERS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <select
          value={party}
          onChange={(e) => { setParty(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:border-[#1B2A4A]/40"
        >
          {PARTIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <select
          value={cycle}
          onChange={(e) => { setCycle(parseInt(e.target.value)); setPage(1); }}
          className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:border-[#1B2A4A]/40"
        >
          {CYCLES.map((c) => <option key={c} value={c}>{c - 1}–{c}</option>)}
        </select>
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={nameSearch}
            onChange={(e) => setNameSearch(e.target.value)}
            placeholder="Search by name..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:border-[#1B2A4A]/40"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-gray-400" />
        </div>
      ) : error ? (
        <div className="text-center py-20 text-red-500">{error}</div>
      ) : recipients.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500 font-medium">
            No contribution data found for this cycle and filters.
          </p>
          <p className="text-sm text-gray-400 mt-2">
            Data syncs weekly from FEC public filings. If this is a recently
            added PAC, records may not have been collected yet.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-600 w-8">#</th>
                  <th
                    className="px-4 py-3 font-semibold text-gray-600 cursor-pointer hover:text-[#1B2A4A]"
                    onClick={() => handleSort("name")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Name <SortIcon col="name" />
                    </span>
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Party</th>
                  <th
                    className="px-4 py-3 font-semibold text-gray-600 cursor-pointer hover:text-[#1B2A4A]"
                    onClick={() => handleSort("state")}
                  >
                    <span className="inline-flex items-center gap-1">
                      State <SortIcon col="state" />
                    </span>
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Office</th>
                  <th
                    className="px-4 py-3 font-semibold text-gray-600 text-right cursor-pointer hover:text-[#1B2A4A]"
                    onClick={() => handleSort("amount")}
                  >
                    <span className="inline-flex items-center gap-1 justify-end">
                      Total Received <SortIcon col="amount" />
                    </span>
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-600 text-right">
                    Contributions
                  </th>
                </tr>
              </thead>
              <tbody>
                {recipients.map((r, idx) => (
                  <>
                    <tr
                      key={r.candidateId}
                      className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer"
                      onClick={() =>
                        setExpandedId(expandedId === r.candidateId ? null : r.candidateId)
                      }
                    >
                      <td className="px-4 py-3 text-gray-400">{(page - 1) * 50 + idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {r.photoUrl ? (
                            <Image
                              src={r.photoUrl}
                              alt={r.candidateName}
                              width={32}
                              height={32}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                              {r.candidateName.charAt(0)}
                            </div>
                          )}
                          <Link
                            href={`/candidate/${r.candidateId}`}
                            className="font-medium text-[#1B2A4A] hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {r.candidateName}
                          </Link>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            r.party.includes("Democrat")
                              ? "bg-blue-50 text-blue-700"
                              : r.party.includes("Republican")
                                ? "bg-red-50 text-red-700"
                                : "bg-gray-50 text-gray-700"
                          }`}
                        >
                          {r.party.charAt(0)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{r.state}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {r.officeType === "US_SENATOR"
                          ? "Senate"
                          : `House${r.district ? ` (${r.district})` : ""}`}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-[#1B2A4A]">
                        {formatCurrency(r.totalAmount)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500">
                        {r.contributionCount}
                      </td>
                    </tr>
                    {expandedId === r.candidateId && (
                      <tr key={`${r.candidateId}-detail`}>
                        <td colSpan={7} className="bg-gray-50/80 px-8 py-4">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                            Individual Contributions
                          </p>
                          <div className="space-y-1">
                            {r.contributions.map((c, ci) => (
                              <div key={ci} className="flex items-center justify-between text-sm py-1">
                                <span className="text-gray-700">
                                  {c.committeeName}
                                  {c.date && (
                                    <span className="text-gray-400 ml-2">
                                      {new Date(c.date).toLocaleDateString()}
                                    </span>
                                  )}
                                </span>
                                <div className="flex items-center gap-3">
                                  <span className="font-medium">{formatCurrency(c.amount)}</span>
                                  {c.fecUrl && (
                                    <a
                                      href={c.fecUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-gray-400 hover:text-[#1B2A4A]"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <ExternalLink size={12} />
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
