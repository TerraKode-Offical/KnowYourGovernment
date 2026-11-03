import { FEDERAL_AGENCIES } from "@/lib/agencies";
import { withErrorHandler, ValidationError, NotFoundError } from "@/lib/api-error-handler";

// ─────────────────────────────────────────────
// GET /api/agencies
//
// Returns the list of tracked federal agencies, enriched with
// budget data from USAspending.gov (cached for 24 hours).
//
// USAspending.gov API is free and requires no API key.
// Docs: https://api.usaspending.gov
// ─────────────────────────────────────────────

interface USASpendingAgency {
  agency_name: string;
  toptier_code: string;
  current_total_budget_authority_amount: number;
  obligated_amount: number;
  percentage_of_total_budget_authority: number;
}

interface USASpendingResponse {
  results: USASpendingAgency[];
}

export interface AgencyWithBudget {
  abbreviation: string;
  name: string;
  description: string;
  url: string;
  category: string;
  budgetAuthority: number | null;
  obligated: number | null;
  percentOfFederalBudget: number | null;
}

/** Fetch top-tier agency budget data from USAspending.gov. */
async function fetchAgencyBudgets(): Promise<Map<string, USASpendingAgency>> {
  try {
    const res = await fetch(
      "https://api.usaspending.gov/api/v2/references/toptier_agencies/",
      { next: { revalidate: 86400 } } // cache 24 hours
    );
    if (!res.ok) return new Map();

    const data: USASpendingResponse = await res.json();
    const map = new Map<string, USASpendingAgency>();
    for (const agency of data.results ?? []) {
      map.set(agency.toptier_code, agency);
    }
    return map;
  } catch {
    return new Map();
  }
}

export const GET = withErrorHandler(async () => {
  const budgetMap = await fetchAgencyBudgets();

  const agencies: AgencyWithBudget[] = FEDERAL_AGENCIES.map((agency) => {
    const budget = budgetMap.get(agency.toptierCode);
    return {
      abbreviation: agency.abbreviation,
      name: agency.name,
      description: agency.description,
      url: agency.url,
      category: agency.category,
      budgetAuthority: budget?.current_total_budget_authority_amount ?? null,
      obligated: budget?.obligated_amount ?? null,
      percentOfFederalBudget:
        budget?.percentage_of_total_budget_authority ?? null,
    };
  });

  return Response.json({ agencies });
}, { route: "GET /api/agencies" });
