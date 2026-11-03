// ─────────────────────────────────────────────
// PAC catalog — notable PACs + Super PACs tracked on knowyourgov.us
// ─────────────────────────────────────────────
//
// Each PAC maps to one or more FEC committee IDs. Some PACs have
// affiliated Super PACs (independent-expenditure arms); we group them
// together so a single page can show the full influence footprint of
// an issue or interest group.
//
// Slugs are URL-friendly identifiers used in /pac-recipients/[slug].
// All FEC IDs come from fec.gov public committee registrations.
// ─────────────────────────────────────────────

export interface PacCatalogEntry {
  slug: string;
  name: string;
  shortName: string;
  /** One-line pitch for the listing card */
  tagline: string;
  /** Full description for the detail page */
  description: string;
  /** Issue / ideology tag for filtering */
  category:
    | "foreign-policy"
    | "guns"
    | "abortion"
    | "environment"
    | "labor"
    | "business"
    | "ideology"
    | "party-leadership"
    | "crypto"
    | "lgbtq"
    | "issue-advocacy";
  /** "traditional" = can give directly to candidates; "super" = independent expenditures */
  kind: "traditional" | "super" | "hybrid";
  /** FEC committee IDs contributing under this brand (traditional PAC, Super PAC, etc.) */
  fecCommitteeIds: string[];
  /** Whether this PAC is considered semi-controversial or high-influence */
  notable: boolean;
  /** Official URL if available */
  officialUrl?: string;
}

export const PAC_CATALOG: PacCatalogEntry[] = [
  // ───── Foreign policy ─────
  {
    slug: "aipac",
    name: "American Israel Public Affairs Committee",
    shortName: "AIPAC",
    tagline: "Largest pro-Israel lobbying organization; spent >$100M in 2024 congressional races.",
    description:
      "AIPAC's traditional PAC contributes directly to candidates who support its policy positions on U.S.–Israel relations. United Democracy Project, its affiliated Super PAC, spends independently in primary elections (notably against progressive Democrats who have criticized Israeli policy). Together they were among the heaviest spenders in the 2024 cycle.",
    category: "foreign-policy",
    kind: "hybrid",
    fecCommitteeIds: ["C00104299", "C00776997"],
    notable: true,
    officialUrl: "https://www.aipac.org",
  },
  {
    slug: "jstreet",
    name: "J Street PAC",
    shortName: "J Street",
    tagline: "Pro-Israel, pro-peace PAC supporting a two-state solution.",
    description:
      "J Street PAC positions itself as a pro-Israel but progressive alternative to AIPAC, backing candidates who support a two-state solution and diplomatic engagement with Palestinians. Typically supports Democratic incumbents and challengers.",
    category: "foreign-policy",
    kind: "traditional",
    fecCommitteeIds: ["C00453471"],
    notable: true,
    officialUrl: "https://jstreetpac.org",
  },
  {
    slug: "dmfi",
    name: "Democratic Majority for Israel PAC",
    shortName: "DMFI PAC",
    tagline: "Pro-Israel Democratic PAC; often opposes progressive primary challengers.",
    description:
      "Democratic Majority for Israel backs pro-Israel Democrats and has spent heavily against progressive primary candidates critical of Israeli government policy, particularly during the 2024 cycle.",
    category: "foreign-policy",
    kind: "hybrid",
    fecCommitteeIds: ["C00694108"],
    notable: true,
    officialUrl: "https://www.democraticmajorityforisrael.org",
  },

  // ───── Guns ─────
  {
    slug: "nra-pvf",
    name: "NRA Political Victory Fund",
    shortName: "NRA-PVF",
    tagline: "National Rifle Association's political arm — gun rights.",
    description:
      "The NRA Political Victory Fund endorses and financially backs candidates who oppose new firearms regulations. Historically one of the most influential single-issue PACs in Congress.",
    category: "guns",
    kind: "traditional",
    fecCommitteeIds: ["C00053553"],
    notable: true,
    officialUrl: "https://www.nrapvf.org",
  },
  {
    slug: "everytown",
    name: "Everytown for Gun Safety Victory Fund",
    shortName: "Everytown",
    tagline: "Gun violence prevention; backs candidates for tighter firearm laws.",
    description:
      "Founded by Michael Bloomberg, Everytown's PAC arm spends on candidates who support universal background checks, red flag laws, and assault weapons restrictions. Major counterweight to the NRA.",
    category: "guns",
    kind: "super",
    fecCommitteeIds: ["C00570047"],
    notable: true,
    officialUrl: "https://www.everytown.org",
  },
  {
    slug: "gun-owners-america",
    name: "Gun Owners of America PAC",
    shortName: "GOA",
    tagline: "Further-right gun-rights PAC; positions itself as uncompromising vs. NRA.",
    description:
      "Gun Owners of America brands itself as the 'no-compromise' alternative to the NRA, backing candidates who oppose any firearms regulation. Active in Republican primaries.",
    category: "guns",
    kind: "traditional",
    fecCommitteeIds: ["C00237402"],
    notable: true,
    officialUrl: "https://gunowners.org",
  },

  // ───── Abortion ─────
  {
    slug: "planned-parenthood",
    name: "Planned Parenthood Action Fund",
    shortName: "Planned Parenthood",
    tagline: "Abortion rights; supports pro-choice candidates nationwide.",
    description:
      "Planned Parenthood Action Fund and its affiliated PACs back candidates who defend abortion access and reproductive healthcare. Spending increased substantially after the 2022 Dobbs decision.",
    category: "abortion",
    kind: "hybrid",
    fecCommitteeIds: ["C00357959", "C00488874"],
    notable: true,
    officialUrl: "https://www.plannedparenthoodaction.org",
  },
  {
    slug: "susan-b-anthony",
    name: "Susan B. Anthony Pro-Life America PAC",
    shortName: "SBA Pro-Life",
    tagline: "Anti-abortion; backs candidates supporting national abortion restrictions.",
    description:
      "SBA Pro-Life America (formerly Susan B. Anthony List) backs candidates committed to restricting or banning abortion at the federal level. Among the largest anti-abortion political groups.",
    category: "abortion",
    kind: "hybrid",
    fecCommitteeIds: ["C00419323", "C00507526"],
    notable: true,
    officialUrl: "https://sbaprolife.org",
  },
  {
    slug: "emilys-list",
    name: "EMILY's List",
    shortName: "EMILY's List",
    tagline: "Backs pro-choice Democratic women candidates.",
    description:
      "EMILY's List ('Early Money Is Like Yeast') recruits and funds pro-choice Democratic women running for federal, state, and local office. One of the oldest and largest ideological PACs in U.S. politics.",
    category: "abortion",
    kind: "hybrid",
    fecCommitteeIds: ["C00193433", "C00578997"],
    notable: true,
    officialUrl: "https://emilyslist.org",
  },

  // ───── Environment ─────
  {
    slug: "lcv",
    name: "League of Conservation Voters Action Fund",
    shortName: "LCV",
    tagline: "Environmental advocacy; publishes an annual Congressional scorecard.",
    description:
      "The League of Conservation Voters grades every member of Congress on environmental votes and backs candidates with strong climate records. Highly active on clean-energy legislation.",
    category: "environment",
    kind: "hybrid",
    fecCommitteeIds: ["C00055897", "C00477422"],
    notable: true,
    officialUrl: "https://www.lcv.org",
  },
  {
    slug: "sierra-club",
    name: "Sierra Club Political Committee",
    shortName: "Sierra Club",
    tagline: "Environmental endorsements; pro–climate action.",
    description:
      "Sierra Club's political arm endorses candidates committed to environmental protection, public lands, and climate legislation.",
    category: "environment",
    kind: "traditional",
    fecCommitteeIds: ["C00135368"],
    notable: false,
    officialUrl: "https://www.sierraclub.org",
  },

  // ───── Labor ─────
  {
    slug: "afl-cio",
    name: "AFL-CIO Committee on Political Education",
    shortName: "AFL-CIO",
    tagline: "Largest federation of U.S. labor unions.",
    description:
      "AFL-CIO's COPE PAC aggregates political giving from member unions and backs pro-labor candidates, heavily Democratic in recent cycles.",
    category: "labor",
    kind: "traditional",
    fecCommitteeIds: ["C00004036"],
    notable: true,
    officialUrl: "https://aflcio.org",
  },
  {
    slug: "seiu",
    name: "SEIU PEA (Service Employees International Union)",
    shortName: "SEIU",
    tagline: "Healthcare, service, and public-sector workers' union.",
    description:
      "Service Employees International Union backs candidates supporting union rights, higher minimum wage, and healthcare access. Major Democratic-aligned PAC.",
    category: "labor",
    kind: "hybrid",
    fecCommitteeIds: ["C00284332"],
    notable: false,
    officialUrl: "https://www.seiu.org",
  },

  // ───── Business / Industry ─────
  {
    slug: "uschamber",
    name: "U.S. Chamber of Commerce Committee for Free Enterprise",
    shortName: "U.S. Chamber",
    tagline: "Largest business lobby; tends to back pro-business Republicans.",
    description:
      "The U.S. Chamber of Commerce's political arm spends heavily on candidates favoring lower corporate taxes, deregulation, and tort reform. Historically Republican-aligned but occasionally backs moderate Democrats.",
    category: "business",
    kind: "hybrid",
    fecCommitteeIds: ["C00082040"],
    notable: true,
    officialUrl: "https://www.uschamber.com",
  },
  {
    slug: "club-for-growth",
    name: "Club for Growth PAC",
    shortName: "Club for Growth",
    tagline: "Conservative economic PAC; very influential in Republican primaries.",
    description:
      "Club for Growth backs candidates committed to tax cuts, deregulation, and free-market economics. Its primary-election spending has reshaped the Republican caucus over the last two decades.",
    category: "ideology",
    kind: "hybrid",
    fecCommitteeIds: ["C00432260", "C00487470"],
    notable: true,
    officialUrl: "https://www.clubforgrowth.org",
  },
  {
    slug: "realtors",
    name: "Realtors Political Action Committee",
    shortName: "NAR",
    tagline: "National Association of Realtors — largest trade association PAC.",
    description:
      "RPAC represents real estate industry interests and is consistently among the top-spending trade-association PACs. Backs candidates of both parties.",
    category: "business",
    kind: "traditional",
    fecCommitteeIds: ["C00030718"],
    notable: false,
    officialUrl: "https://www.nar.realtor",
  },

  // ───── Party leadership (Super PACs) ─────
  {
    slug: "congressional-leadership-fund",
    name: "Congressional Leadership Fund",
    shortName: "CLF",
    tagline: "Super PAC aligned with the House Republican leadership.",
    description:
      "CLF is the primary Super PAC aligned with the Speaker of the House (Republican). It spends heavily in competitive House districts to hold or grow the GOP majority.",
    category: "party-leadership",
    kind: "super",
    fecCommitteeIds: ["C00504530"],
    notable: true,
  },
  {
    slug: "senate-leadership-fund",
    name: "Senate Leadership Fund",
    shortName: "SLF",
    tagline: "Super PAC aligned with the Senate Republican leadership.",
    description:
      "SLF is the Republican Senate leadership's primary Super PAC, spending on competitive Senate races to hold or win the majority.",
    category: "party-leadership",
    kind: "super",
    fecCommitteeIds: ["C00571703"],
    notable: true,
  },
  {
    slug: "house-majority-pac",
    name: "House Majority PAC",
    shortName: "HMP",
    tagline: "Super PAC aligned with House Democratic leadership.",
    description:
      "HMP is the primary Super PAC supporting Democratic candidates in competitive House districts, coordinated with the Democratic Congressional Campaign Committee.",
    category: "party-leadership",
    kind: "super",
    fecCommitteeIds: ["C00499110"],
    notable: true,
  },
  {
    slug: "senate-majority-pac",
    name: "Senate Majority PAC",
    shortName: "SMP",
    tagline: "Super PAC aligned with Senate Democratic leadership.",
    description:
      "SMP is the Democrats' primary Senate Super PAC, spending on competitive Senate races to hold or grow the majority.",
    category: "party-leadership",
    kind: "super",
    fecCommitteeIds: ["C00484642"],
    notable: true,
  },

  // ───── Crypto ─────
  {
    slug: "fairshake",
    name: "Fairshake",
    shortName: "Fairshake",
    tagline: "Crypto industry Super PAC; spent >$200M in 2024 cycle.",
    description:
      "Fairshake is a cryptocurrency-industry Super PAC funded by Coinbase, a16z, Ripple, and others. It was among the top-spending Super PACs of the 2024 cycle and played a decisive role in several competitive primaries, backing candidates aligned with favorable crypto regulation.",
    category: "crypto",
    kind: "super",
    fecCommitteeIds: ["C00835959"],
    notable: true,
    officialUrl: "https://fairshakepac.com",
  },

  // ───── LGBTQ+ ─────
  {
    slug: "hrc",
    name: "Human Rights Campaign PAC",
    shortName: "HRC",
    tagline: "Largest LGBTQ+ civil rights organization's political arm.",
    description:
      "Human Rights Campaign endorses and funds candidates supporting LGBTQ+ equality legislation, including the Equality Act and anti-discrimination protections.",
    category: "lgbtq",
    kind: "traditional",
    fecCommitteeIds: ["C00104645"],
    notable: true,
    officialUrl: "https://www.hrc.org",
  },
];

export function getPacBySlug(slug: string): PacCatalogEntry | null {
  return PAC_CATALOG.find((p) => p.slug === slug) ?? null;
}

export function getAllCommitteeIds(): string[] {
  return Array.from(
    new Set(PAC_CATALOG.flatMap((p) => p.fecCommitteeIds))
  );
}

export const PAC_CATEGORY_LABELS: Record<PacCatalogEntry["category"], string> = {
  "foreign-policy": "Foreign Policy",
  guns: "Guns",
  abortion: "Abortion",
  environment: "Environment",
  labor: "Labor",
  business: "Business",
  ideology: "Ideology",
  "party-leadership": "Party Leadership",
  crypto: "Crypto",
  lgbtq: "LGBTQ+",
  "issue-advocacy": "Issue Advocacy",
};
