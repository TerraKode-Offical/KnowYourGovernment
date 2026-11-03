// ─────────────────────────────────────────────
// Federal agency metadata
// ─────────────────────────────────────────────

export interface FederalAgency {
  /** Common abbreviation (e.g. "EPA") */
  abbreviation: string;
  /** Full official name */
  name: string;
  /** Brief description of the agency's mission */
  description: string;
  /** Website URL */
  url: string;
  /** USAspending.gov toptier agency code (for budget lookup) */
  toptierCode: string;
  /** Icon category for UI grouping */
  category: AgencyCategory;
  /** Search keywords for matching bills in Congress.gov */
  billSearchTerms: string[];
}

export type AgencyCategory =
  | "defense"
  | "health"
  | "environment"
  | "justice"
  | "economy"
  | "infrastructure"
  | "education"
  | "science"
  | "social";

/**
 * Major federal agencies. Ordered roughly by budget size.
 * toptierCode values correspond to USAspending.gov's agency hierarchy.
 */
export const FEDERAL_AGENCIES: FederalAgency[] = [
  {
    abbreviation: "DOD",
    name: "Department of Defense",
    description: "Military operations, national defense, and the armed forces.",
    url: "https://www.defense.gov",
    toptierCode: "097",
    category: "defense",
    billSearchTerms: ["Department of Defense", "military", "armed forces"],
  },
  {
    abbreviation: "HHS",
    name: "Department of Health and Human Services",
    description: "Public health, Medicare, Medicaid, CDC, FDA, and NIH.",
    url: "https://www.hhs.gov",
    toptierCode: "075",
    category: "health",
    billSearchTerms: ["Health and Human Services", "Medicare", "Medicaid"],
  },
  {
    abbreviation: "VA",
    name: "Department of Veterans Affairs",
    description: "Benefits, healthcare, and services for military veterans.",
    url: "https://www.va.gov",
    toptierCode: "036",
    category: "social",
    billSearchTerms: ["Veterans Affairs", "veteran benefits"],
  },
  {
    abbreviation: "SSA",
    name: "Social Security Administration",
    description: "Social Security retirement, disability, and survivor benefits.",
    url: "https://www.ssa.gov",
    toptierCode: "028",
    category: "social",
    billSearchTerms: ["Social Security"],
  },
  {
    abbreviation: "ED",
    name: "Department of Education",
    description: "Federal education policy, student loans, and school funding.",
    url: "https://www.ed.gov",
    toptierCode: "091",
    category: "education",
    billSearchTerms: ["Department of Education", "student loans", "federal education"],
  },
  {
    abbreviation: "DHS",
    name: "Department of Homeland Security",
    description: "Border security, FEMA, TSA, immigration, and cybersecurity.",
    url: "https://www.dhs.gov",
    toptierCode: "024",
    category: "defense",
    billSearchTerms: ["Homeland Security", "FEMA", "border security"],
  },
  {
    abbreviation: "DOJ",
    name: "Department of Justice",
    description: "Federal law enforcement, FBI, DEA, ATF, and the court system.",
    url: "https://www.justice.gov",
    toptierCode: "015",
    category: "justice",
    billSearchTerms: ["Department of Justice", "FBI", "law enforcement"],
  },
  {
    abbreviation: "DOT",
    name: "Department of Transportation",
    description: "Highways, aviation (FAA), transit, rail, and auto safety.",
    url: "https://www.transportation.gov",
    toptierCode: "069",
    category: "infrastructure",
    billSearchTerms: ["Department of Transportation", "FAA", "highway"],
  },
  {
    abbreviation: "USDA",
    name: "Department of Agriculture",
    description: "Farm policy, food safety, SNAP benefits, and forestry.",
    url: "https://www.usda.gov",
    toptierCode: "012",
    category: "economy",
    billSearchTerms: ["Department of Agriculture", "USDA", "SNAP", "farm bill"],
  },
  {
    abbreviation: "DOE",
    name: "Department of Energy",
    description: "Energy policy, nuclear security, national laboratories.",
    url: "https://www.energy.gov",
    toptierCode: "089",
    category: "science",
    billSearchTerms: ["Department of Energy", "nuclear", "energy policy"],
  },
  {
    abbreviation: "EPA",
    name: "Environmental Protection Agency",
    description: "Clean air, water quality, hazardous waste, and climate programs.",
    url: "https://www.epa.gov",
    toptierCode: "020",
    category: "environment",
    billSearchTerms: ["Environmental Protection Agency", "EPA", "clean air", "clean water"],
  },
  {
    abbreviation: "HUD",
    name: "Department of Housing and Urban Development",
    description: "Affordable housing, fair housing enforcement, and community development.",
    url: "https://www.hud.gov",
    toptierCode: "086",
    category: "social",
    billSearchTerms: ["Housing and Urban Development", "HUD", "affordable housing"],
  },
  {
    abbreviation: "NASA",
    name: "National Aeronautics and Space Administration",
    description: "Space exploration, aeronautics research, and Earth science.",
    url: "https://www.nasa.gov",
    toptierCode: "080",
    category: "science",
    billSearchTerms: ["NASA", "space exploration"],
  },
  {
    abbreviation: "DOI",
    name: "Department of the Interior",
    description: "Public lands, national parks, tribal affairs, and natural resources.",
    url: "https://www.doi.gov",
    toptierCode: "014",
    category: "environment",
    billSearchTerms: ["Department of the Interior", "national parks", "public lands"],
  },
  {
    abbreviation: "DOS",
    name: "Department of State",
    description: "Foreign affairs, diplomacy, embassies, and international aid.",
    url: "https://www.state.gov",
    toptierCode: "019",
    category: "defense",
    billSearchTerms: ["Department of State", "foreign affairs", "diplomacy"],
  },
  {
    abbreviation: "DOL",
    name: "Department of Labor",
    description: "Worker protections, job training, unemployment insurance, and OSHA.",
    url: "https://www.dol.gov",
    toptierCode: "016",
    category: "economy",
    billSearchTerms: ["Department of Labor", "OSHA", "unemployment"],
  },
  {
    abbreviation: "SBA",
    name: "Small Business Administration",
    description: "Loans, counseling, and contracting for small businesses.",
    url: "https://www.sba.gov",
    toptierCode: "073",
    category: "economy",
    billSearchTerms: ["Small Business Administration", "SBA"],
  },
  {
    abbreviation: "TREAS",
    name: "Department of the Treasury",
    description: "Tax collection (IRS), currency, financial regulation, and sanctions.",
    url: "https://www.treasury.gov",
    toptierCode: "015",
    category: "economy",
    billSearchTerms: ["Department of the Treasury", "IRS", "tax"],
  },
  {
    abbreviation: "DOC",
    name: "Department of Commerce",
    description: "Census Bureau, NOAA, Patent Office, and trade policy.",
    url: "https://www.commerce.gov",
    toptierCode: "013",
    category: "economy",
    billSearchTerms: ["Department of Commerce", "Census", "NOAA", "trade"],
  },
  {
    abbreviation: "NSF",
    name: "National Science Foundation",
    description: "Funding for scientific research and STEM education.",
    url: "https://www.nsf.gov",
    toptierCode: "049",
    category: "science",
    billSearchTerms: ["National Science Foundation", "NSF", "scientific research"],
  },
];

// ─────────────────────────────────────────────
// Category display helpers
// ─────────────────────────────────────────────

export const CATEGORY_LABELS: Record<AgencyCategory, string> = {
  defense: "Defense & Security",
  health: "Health",
  environment: "Environment & Land",
  justice: "Justice & Law",
  economy: "Economy & Trade",
  infrastructure: "Infrastructure",
  education: "Education",
  science: "Science & Technology",
  social: "Social Services",
};

export const CATEGORY_COLORS: Record<AgencyCategory, string> = {
  defense: "bg-red-100 text-red-700",
  health: "bg-pink-100 text-pink-700",
  environment: "bg-green-100 text-green-700",
  justice: "bg-indigo-100 text-indigo-700",
  economy: "bg-amber-100 text-amber-700",
  infrastructure: "bg-orange-100 text-orange-700",
  education: "bg-blue-100 text-blue-700",
  science: "bg-violet-100 text-violet-700",
  social: "bg-teal-100 text-teal-700",
};
