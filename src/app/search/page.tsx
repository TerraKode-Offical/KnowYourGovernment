import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";

// ─────────────────────────────────────────────
// /search?q=<term>
// Server-rendered full-text search across bills and candidates.
// Referenced by the site-wide JSON-LD SearchAction.
// ─────────────────────────────────────────────

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Search",
  description:
    "Search federal bills and candidates across InformedVoter in plain English.",
  robots: { index: false, follow: true },
};

const MAX_RESULTS = 20;
const MIN_QUERY = 2;
const MAX_QUERY = 200;

interface BillResult {
  id: number;
  externalId: string;
  title: string;
  shortTitle: string | null;
  chamber: string;
  status: string;
  state: { abbreviation: string } | null;
}

interface CandidateResult {
  id: number;
  name: string;
  party: string;
  officeType: string;
  district: string | null;
}

async function runSearch(q: string): Promise<{
  bills: BillResult[];
  candidates: CandidateResult[];
}> {
  const [bills, candidates] = await Promise.all([
    prisma.bill.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { shortTitle: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        externalId: true,
        title: true,
        shortTitle: true,
        chamber: true,
        status: true,
        state: { select: { abbreviation: true } },
      },
      orderBy: { introducedDate: "desc" },
      take: MAX_RESULTS,
    }),
    prisma.candidate.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      select: {
        id: true,
        name: true,
        party: true,
        officeType: true,
        district: true,
      },
      orderBy: { name: "asc" },
      take: MAX_RESULTS,
    }),
  ]);
  return { bills, candidates };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const valid = query.length >= MIN_QUERY && query.length <= MAX_QUERY;

  let bills: BillResult[] = [];
  let candidates: CandidateResult[] = [];
  let failed = false;

  if (valid) {
    try {
      const results = await runSearch(query);
      bills = results.bills;
      candidates = results.candidates;
    } catch {
      // Never surface internal details; degrade to an empty result set.
      failed = true;
    }
  }

  const total = bills.length + candidates.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#1B2A4A] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <h1 className="text-3xl sm:text-4xl font-bold">Search</h1>
          <p className="text-white/60 mt-2">
            Find federal bills and candidates, in plain English.
          </p>

          <form method="GET" action="/search" className="mt-6 flex gap-2">
            <label htmlFor="search-q" className="sr-only">
              Search term
            </label>
            <input
              id="search-q"
              name="q"
              type="search"
              defaultValue={query}
              placeholder="e.g. healthcare, climate, a candidate name"
              className="flex-1 px-4 py-3 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-white/40"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-white text-[#1B2A4A] rounded-xl text-sm font-semibold hover:bg-white/90 transition-colors"
            >
              Search
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        {!valid && (
          <p className="text-gray-600">
            Enter at least {MIN_QUERY} characters to search.
          </p>
        )}

        {valid && failed && (
          <p className="text-gray-600">
            We couldn&apos;t complete that search right now. Please try again in a
            moment.
          </p>
        )}

        {valid && !failed && total === 0 && (
          <p className="text-gray-600">
            Sorry, but we can&apos;t find anything for &ldquo;{query}&rdquo;. Try a
            different term.
          </p>
        )}

        {bills.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-[#1B2A4A] mb-4">
              Bills ({bills.length})
            </h2>
            <ul className="space-y-3">
              {bills.map((b) => (
                <li
                  key={b.id}
                  className="bg-white rounded-xl border border-gray-200 p-4"
                >
                  <Link
                    href={
                      b.state
                        ? `/state/${b.state.abbreviation}/bills/${b.id}`
                        : "/bills"
                    }
                    className="font-semibold text-[#1B2A4A] hover:underline"
                  >
                    {b.title}
                  </Link>
                  <p className="text-xs text-gray-500 mt-1">
                    {b.chamber} · {b.status} · {b.externalId}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {candidates.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-[#1B2A4A] mb-4">
              Candidates ({candidates.length})
            </h2>
            <ul className="space-y-3">
              {candidates.map((c) => (
                <li
                  key={c.id}
                  className="bg-white rounded-xl border border-gray-200 p-4"
                >
                  <Link
                    href={`/candidate/${c.id}`}
                    className="font-semibold text-[#1B2A4A] hover:underline"
                  >
                    {c.name}
                  </Link>
                  <p className="text-xs text-gray-500 mt-1">
                    {c.party}
                    {c.district ? ` · District ${c.district}` : ""} · {c.officeType}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
