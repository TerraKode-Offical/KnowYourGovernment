/**
 * prisma/seed.ts
 *
 * Seed the InformedVoter database with:
 *   - All 50 US states
 *   - Sample senators (CA, TX, NY)
 *   - Sample bills with mock AI analysis
 *   - Sample VoterInfo for CA and TX
 *
 * Run with:   npm run db:seed
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require("@prisma/client");

// Enum values — keep in sync with prisma/schema.prisma
const Chamber = { HOUSE: "HOUSE", SENATE: "SENATE" } as const;
const BillStatus = {
  INTRODUCED: "INTRODUCED",
  IN_COMMITTEE: "IN_COMMITTEE",
  PASSED_HOUSE: "PASSED_HOUSE",
  PASSED_SENATE: "PASSED_SENATE",
  SIGNED: "SIGNED",
  VETOED: "VETOED",
  FAILED: "FAILED",
} as const;
const OfficeType = {
  PRESIDENT: "PRESIDENT",
  US_SENATOR: "US_SENATOR",
  US_REPRESENTATIVE: "US_REPRESENTATIVE",
  GOVERNOR: "GOVERNOR",
  STATE_SENATOR: "STATE_SENATOR",
  STATE_REP: "STATE_REP",
  OTHER: "OTHER",
} as const;

type ChamberType = (typeof Chamber)[keyof typeof Chamber];
type BillStatusType = (typeof BillStatus)[keyof typeof BillStatus];
type OfficeTypeValue = (typeof OfficeType)[keyof typeof OfficeType];
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

// ─────────────────────────────────────────────
// State data
// ─────────────────────────────────────────────

interface StateEntry {
  name: string;
  abbreviation: string;
  fipsCode: string;
}

function loadStates(): StateEntry[] {
  // Try to read from public/data/states.json; fall back to hardcoded list
  const jsonPath = path.join(process.cwd(), "public", "data", "states.json");
  if (fs.existsSync(jsonPath)) {
    const raw = fs.readFileSync(jsonPath, "utf-8");
    return JSON.parse(raw) as StateEntry[];
  }

  // Hardcoded fallback — all 50 states
  return [
    { name: "Alabama", abbreviation: "AL", fipsCode: "01" },
    { name: "Alaska", abbreviation: "AK", fipsCode: "02" },
    { name: "Arizona", abbreviation: "AZ", fipsCode: "04" },
    { name: "Arkansas", abbreviation: "AR", fipsCode: "05" },
    { name: "California", abbreviation: "CA", fipsCode: "06" },
    { name: "Colorado", abbreviation: "CO", fipsCode: "08" },
    { name: "Connecticut", abbreviation: "CT", fipsCode: "09" },
    { name: "Delaware", abbreviation: "DE", fipsCode: "10" },
    { name: "Florida", abbreviation: "FL", fipsCode: "12" },
    { name: "Georgia", abbreviation: "GA", fipsCode: "13" },
    { name: "Hawaii", abbreviation: "HI", fipsCode: "15" },
    { name: "Idaho", abbreviation: "ID", fipsCode: "16" },
    { name: "Illinois", abbreviation: "IL", fipsCode: "17" },
    { name: "Indiana", abbreviation: "IN", fipsCode: "18" },
    { name: "Iowa", abbreviation: "IA", fipsCode: "19" },
    { name: "Kansas", abbreviation: "KS", fipsCode: "20" },
    { name: "Kentucky", abbreviation: "KY", fipsCode: "21" },
    { name: "Louisiana", abbreviation: "LA", fipsCode: "22" },
    { name: "Maine", abbreviation: "ME", fipsCode: "23" },
    { name: "Maryland", abbreviation: "MD", fipsCode: "24" },
    { name: "Massachusetts", abbreviation: "MA", fipsCode: "25" },
    { name: "Michigan", abbreviation: "MI", fipsCode: "26" },
    { name: "Minnesota", abbreviation: "MN", fipsCode: "27" },
    { name: "Mississippi", abbreviation: "MS", fipsCode: "28" },
    { name: "Missouri", abbreviation: "MO", fipsCode: "29" },
    { name: "Montana", abbreviation: "MT", fipsCode: "30" },
    { name: "Nebraska", abbreviation: "NE", fipsCode: "31" },
    { name: "Nevada", abbreviation: "NV", fipsCode: "32" },
    { name: "New Hampshire", abbreviation: "NH", fipsCode: "33" },
    { name: "New Jersey", abbreviation: "NJ", fipsCode: "34" },
    { name: "New Mexico", abbreviation: "NM", fipsCode: "35" },
    { name: "New York", abbreviation: "NY", fipsCode: "36" },
    { name: "North Carolina", abbreviation: "NC", fipsCode: "37" },
    { name: "North Dakota", abbreviation: "ND", fipsCode: "38" },
    { name: "Ohio", abbreviation: "OH", fipsCode: "39" },
    { name: "Oklahoma", abbreviation: "OK", fipsCode: "40" },
    { name: "Oregon", abbreviation: "OR", fipsCode: "41" },
    { name: "Pennsylvania", abbreviation: "PA", fipsCode: "42" },
    { name: "Rhode Island", abbreviation: "RI", fipsCode: "44" },
    { name: "South Carolina", abbreviation: "SC", fipsCode: "45" },
    { name: "South Dakota", abbreviation: "SD", fipsCode: "46" },
    { name: "Tennessee", abbreviation: "TN", fipsCode: "47" },
    { name: "Texas", abbreviation: "TX", fipsCode: "48" },
    { name: "Utah", abbreviation: "UT", fipsCode: "49" },
    { name: "Vermont", abbreviation: "VT", fipsCode: "50" },
    { name: "Virginia", abbreviation: "VA", fipsCode: "51" },
    { name: "Washington", abbreviation: "WA", fipsCode: "53" },
    { name: "West Virginia", abbreviation: "WV", fipsCode: "54" },
    { name: "Wisconsin", abbreviation: "WI", fipsCode: "55" },
    { name: "Wyoming", abbreviation: "WY", fipsCode: "56" },
  ];
}

// ─────────────────────────────────────────────
// Main seed
// ─────────────────────────────────────────────

async function main() {
  console.log("Seeding database...");

  // ── 1. States ───────────────────────────────
  console.log("Upserting states...");
  const states = loadStates();

  for (const s of states) {
    await prisma.state.upsert({
      where: { abbreviation: s.abbreviation },
      create: { name: s.name, abbreviation: s.abbreviation, fipsCode: s.fipsCode },
      update: { name: s.name, fipsCode: s.fipsCode },
    });
  }
  console.log(`  ✓ ${states.length} states upserted`);

  // Resolve state IDs we'll need later
  const caState = await prisma.state.findUnique({ where: { abbreviation: "CA" } });
  const txState = await prisma.state.findUnique({ where: { abbreviation: "TX" } });
  const nyState = await prisma.state.findUnique({ where: { abbreviation: "NY" } });

  if (!caState || !txState || !nyState) {
    throw new Error("State seed failed — could not resolve CA, TX, or NY");
  }

  // ── 2. Sample Candidates (Senators) ─────────
  console.log("Upserting sample candidates...");

  const candidateData: Array<{
    name: string;
    party: string;
    officeType: OfficeTypeValue;
    stateId: number;
    isIncumbent: boolean;
    biography: string;
    websiteUrl: string;
    socialMedia: Record<string, string>;
  }> = [
    // California senators
    {
      name: "Alex Padilla",
      party: "Democrat",
      officeType: OfficeType.US_SENATOR,
      stateId: caState.id,
      isIncumbent: true,
      biography:
        "Alex Padilla is the senior United States Senator from California. He was appointed in January 2021 and later elected to a full term in 2022.",
      websiteUrl: "https://www.padilla.senate.gov",
      socialMedia: { twitter: "@SenAlexPadilla" },
    },
    {
      name: "Adam Schiff",
      party: "Democrat",
      officeType: OfficeType.US_SENATOR,
      stateId: caState.id,
      isIncumbent: true,
      biography:
        "Adam Schiff is the junior United States Senator from California, elected in 2024. He previously served as a U.S. Representative and chaired the House Intelligence Committee.",
      websiteUrl: "https://www.schiff.senate.gov",
      socialMedia: { twitter: "@SenAdamSchiff" },
    },
    // Texas senators
    {
      name: "John Cornyn",
      party: "Republican",
      officeType: OfficeType.US_SENATOR,
      stateId: txState.id,
      isIncumbent: true,
      biography:
        "John Cornyn is the senior United States Senator from Texas, serving since 2002. He previously served as Texas Attorney General.",
      websiteUrl: "https://www.cornyn.senate.gov",
      socialMedia: { twitter: "@JohnCornyn" },
    },
    {
      name: "Ted Cruz",
      party: "Republican",
      officeType: OfficeType.US_SENATOR,
      stateId: txState.id,
      isIncumbent: true,
      biography:
        "Ted Cruz is the junior United States Senator from Texas, serving since 2013. He previously served as Texas Solicitor General.",
      websiteUrl: "https://www.cruz.senate.gov",
      socialMedia: { twitter: "@SenTedCruz" },
    },
    // New York senators
    {
      name: "Chuck Schumer",
      party: "Democrat",
      officeType: OfficeType.US_SENATOR,
      stateId: nyState.id,
      isIncumbent: true,
      biography:
        "Chuck Schumer is the senior United States Senator from New York and the Senate Majority Leader. He has served since 1999.",
      websiteUrl: "https://www.schumer.senate.gov",
      socialMedia: { twitter: "@SenSchumer" },
    },
    {
      name: "Kirsten Gillibrand",
      party: "Democrat",
      officeType: OfficeType.US_SENATOR,
      stateId: nyState.id,
      isIncumbent: true,
      biography:
        "Kirsten Gillibrand is the junior United States Senator from New York, serving since 2009. She was appointed to fill Hillary Clinton's seat and has since been elected twice.",
      websiteUrl: "https://www.gillibrand.senate.gov",
      socialMedia: { twitter: "@SenGillibrand" },
    },
  ];

  const createdCandidates: { id: number; name: string }[] = [];

  for (const c of candidateData) {
    // Candidates don't have a natural unique key beyond name+state+officeType
    // so we use findFirst + upsert pattern
    const existing = await prisma.candidate.findFirst({
      where: {
        name: c.name,
        stateId: c.stateId,
        officeType: c.officeType,
      },
    });

    const candidate = existing
      ? await prisma.candidate.update({
          where: { id: existing.id },
          data: {
            party: c.party,
            biography: c.biography,
            websiteUrl: c.websiteUrl,
            socialMedia: c.socialMedia,
            isIncumbent: c.isIncumbent,
          },
        })
      : await prisma.candidate.create({
          data: {
            name: c.name,
            party: c.party,
            officeType: c.officeType,
            stateId: c.stateId,
            isIncumbent: c.isIncumbent,
            biography: c.biography,
            websiteUrl: c.websiteUrl,
            socialMedia: c.socialMedia,
            contactInfo: {},
          },
        });

    createdCandidates.push({ id: candidate.id, name: candidate.name });
  }

  console.log(`  ✓ ${createdCandidates.length} candidates upserted`);

  // ── 3. Sample Bills with mock AI analysis ───
  console.log("Upserting sample bills...");

  const schiff = createdCandidates.find((c) => c.name === "Adam Schiff");
  const cornyn = createdCandidates.find((c) => c.name === "John Cornyn");
  const schumer = createdCandidates.find((c) => c.name === "Chuck Schumer");

  const billData: Array<{
    externalId: string;
    title: string;
    shortTitle: string;
    chamber: ChamberType;
    status: BillStatusType;
    stateId: number | null;
    introducedDate: Date;
    lastActionDate: Date | null;
    executiveSummary: string;
    detailedSummary: string;
    aiRiderAnalysis: string;
    hiddenClauses: object[];
    subjects: string[];
    sponsorId: number | null;
    congressGovUrl: string;
  }> = [
    {
      externalId: "119-s-100",
      title: "Clean Energy Innovation and Deployment Act of 2025",
      shortTitle: "Clean Energy Innovation Act",
      chamber: Chamber.SENATE,
      status: BillStatus.IN_COMMITTEE,
      stateId: null as number | null,
      introducedDate: new Date("2025-01-15"),
      lastActionDate: new Date("2025-02-20"),
      executiveSummary:
        "This bill establishes a federal clean energy research and deployment program, directing the Department of Energy to invest in next-generation renewable energy technologies including solar, wind, and advanced nuclear.",
      detailedSummary:
        "The Clean Energy Innovation and Deployment Act creates a 10-year, $50 billion program to accelerate the development and commercialization of clean energy technologies. Key provisions include grants for university research, tax incentives for private sector R&D, and a new Clean Energy Manufacturing Initiative to create domestic supply chains for critical components.",
      aiRiderAnalysis:
        "One provision in Section 14 extends tax deductions for oil and gas exploration equipment, which is unrelated to the bill's stated clean energy focus and may qualify as a legislative rider.",
      hiddenClauses: [
        {
          title: "Oil & Gas Equipment Deduction Extension",
          description:
            "Section 14 extends accelerated depreciation for oil and gas drilling equipment by 5 years, which is unrelated to the bill's clean energy purpose.",
          concern_level: "medium",
          page_reference: "Section 14, pages 47-49",
        },
      ],
      subjects: ["Energy", "Climate", "Research & Development", "Taxation"],
      sponsorId: schiff?.id ?? null,
      congressGovUrl: "https://www.congress.gov/bill/119th-congress/senate-bill/100",
    },
    {
      externalId: "119-s-205",
      title: "Securing America's Borders Act",
      shortTitle: "Borders Act",
      chamber: Chamber.SENATE,
      status: BillStatus.PASSED_SENATE,
      stateId: null as number | null,
      introducedDate: new Date("2025-02-01"),
      lastActionDate: new Date("2025-03-10"),
      executiveSummary:
        "This bill increases funding for border security infrastructure, adds 1,500 new Border Patrol agents, and reforms the asylum application process to reduce backlogs.",
      detailedSummary:
        "The Securing America's Borders Act authorizes $8.5 billion over five years for physical border infrastructure upgrades, surveillance technology, and personnel expansion. It also establishes a new fast-track asylum review process aimed at deciding cases within 90 days and increases immigration judges by 300.",
      aiRiderAnalysis:
        "No unrelated riders detected. All provisions appear directly related to the bill's stated border security and immigration processing objectives.",
      hiddenClauses: [],
      subjects: ["Immigration", "Border Security", "Asylum", "Law Enforcement"],
      sponsorId: cornyn?.id ?? null,
      congressGovUrl: "https://www.congress.gov/bill/119th-congress/senate-bill/205",
    },
    {
      externalId: "119-s-312",
      title: "Affordable Housing for All Americans Act",
      shortTitle: "Affordable Housing Act",
      chamber: Chamber.SENATE,
      status: BillStatus.INTRODUCED,
      stateId: null as number | null,
      introducedDate: new Date("2025-03-05"),
      lastActionDate: null,
      executiveSummary:
        "This bill expands the Low-Income Housing Tax Credit, provides new grants to states for affordable housing construction, and streamlines zoning reform incentives to increase housing supply.",
      detailedSummary:
        "The Affordable Housing for All Americans Act addresses the national housing shortage through three main mechanisms: a 50% expansion of the LIHTC program, $20 billion in competitive state grants for affordable unit construction, and financial incentives for localities that adopt pro-housing zoning reforms such as by-right multifamily permitting and reduced parking minimums.",
      aiRiderAnalysis:
        "Two provisions may qualify as riders: Section 22 includes unrelated changes to commercial real estate depreciation schedules, and Section 31 modifies flood insurance premium calculation for non-residential properties.",
      hiddenClauses: [
        {
          title: "Commercial Real Estate Depreciation Change",
          description:
            "Section 22 modifies the depreciation schedule for commercial office buildings from 39 to 30 years, benefiting commercial real estate investors but unrelated to affordable housing.",
          concern_level: "high",
          page_reference: "Section 22, pages 78-82",
        },
        {
          title: "Flood Insurance Premium Adjustment",
          description:
            "Section 31 revises FEMA flood insurance rate formulas for commercial properties, which has minimal connection to affordable housing supply.",
          concern_level: "low",
          page_reference: "Section 31, pages 103-105",
        },
      ],
      subjects: ["Housing", "Tax Credits", "Zoning", "Low-Income Assistance"],
      sponsorId: schumer?.id ?? null,
      congressGovUrl: "https://www.congress.gov/bill/119th-congress/senate-bill/312",
    },
  ];

  for (const b of billData) {
    await prisma.bill.upsert({
      where: { externalId: b.externalId },
      create: {
        externalId: b.externalId,
        title: b.title,
        shortTitle: b.shortTitle,
        chamber: b.chamber,
        status: b.status,
        stateId: b.stateId,
        introducedDate: b.introducedDate,
        lastActionDate: b.lastActionDate,
        executiveSummary: b.executiveSummary,
        detailedSummary: b.detailedSummary,
        aiRiderAnalysis: b.aiRiderAnalysis,
        hiddenClauses: b.hiddenClauses,
        subjects: b.subjects,
        sponsorId: b.sponsorId,
        congressGovUrl: b.congressGovUrl,
      },
      update: {
        title: b.title,
        shortTitle: b.shortTitle,
        status: b.status,
        lastActionDate: b.lastActionDate,
        executiveSummary: b.executiveSummary,
        detailedSummary: b.detailedSummary,
        aiRiderAnalysis: b.aiRiderAnalysis,
        hiddenClauses: b.hiddenClauses,
        subjects: b.subjects,
        sponsorId: b.sponsorId,
      },
    });
  }

  console.log(`  ✓ ${billData.length} bills upserted`);

  // ── 4. Sample VoterInfo ──────────────────────
  console.log("Upserting sample voter info...");

  const voterInfoData = [
    {
      stateId: caState.id,
      registrationDeadline: new Date("2026-10-19"), // 15 days before election
      registrationUrl: "https://registertovote.ca.gov",
      earlyVotingStart: new Date("2026-10-05"),
      earlyVotingEnd: new Date("2026-11-01"),
      absenteeDeadline: new Date("2026-10-27"),
      absenteeUrl: "https://www.sos.ca.gov/elections/voter-registration/vote-mail",
      pollingHoursStart: "07:00",
      pollingHoursEnd: "20:00",
      voterIdRequirements:
        "California does not require voters to show ID at the polls for most voters. First-time voters who registered by mail and did not provide ID during registration may be asked for ID.",
      onlineRegistration: true,
      sameDayRegistration: true,
      additionalNotes:
        "All registered voters automatically receive a mail ballot. You may return it by mail, drop box, or in person.",
      stateElectionWebsite: "https://www.sos.ca.gov/elections",
      stateSOSName: "Secretary of State",
      stateSOSPhone: "1-800-345-VOTE",
      ballotTrackingUrl: "https://california.ballottrax.net",
    },
    {
      stateId: txState.id,
      registrationDeadline: new Date("2026-10-05"), // 30 days before election
      registrationUrl: "https://www.sos.state.tx.us/elections/voter/",
      earlyVotingStart: new Date("2026-10-19"),
      earlyVotingEnd: new Date("2026-10-30"),
      absenteeDeadline: new Date("2026-10-23"),
      absenteeUrl: "https://www.sos.state.tx.us/elections/voter/reqabbv.shtml",
      pollingHoursStart: "07:00",
      pollingHoursEnd: "19:00",
      voterIdRequirements:
        "Texas requires voters to present an approved photo ID (driver's license, state ID, passport, military ID, concealed handgun license) or a Reasonable Impediment Declaration with supporting documentation.",
      onlineRegistration: false,
      sameDayRegistration: false,
      additionalNotes:
        "Mail-in voting (absentee) is limited to voters 65+, disabled, confined, or expecting to be away from county during the entire early voting period and on Election Day.",
      stateElectionWebsite: "https://www.sos.state.tx.us/elections",
      stateSOSName: "Secretary of State",
      stateSOSPhone: "1-800-252-VOTE",
      ballotTrackingUrl: null,
    },
  ];

  for (const v of voterInfoData) {
    await prisma.voterInfo.upsert({
      where: { stateId: v.stateId },
      create: v,
      update: {
        registrationDeadline: v.registrationDeadline,
        registrationUrl: v.registrationUrl,
        earlyVotingStart: v.earlyVotingStart,
        earlyVotingEnd: v.earlyVotingEnd,
        absenteeDeadline: v.absenteeDeadline,
        absenteeUrl: v.absenteeUrl,
        pollingHoursStart: v.pollingHoursStart,
        pollingHoursEnd: v.pollingHoursEnd,
        voterIdRequirements: v.voterIdRequirements,
        onlineRegistration: v.onlineRegistration,
        sameDayRegistration: v.sameDayRegistration,
        additionalNotes: v.additionalNotes,
        stateElectionWebsite: v.stateElectionWebsite,
        stateSOSName: v.stateSOSName,
        stateSOSPhone: v.stateSOSPhone,
        ballotTrackingUrl: v.ballotTrackingUrl,
      },
    });
  }

  console.log(`  ✓ ${voterInfoData.length} voter info records upserted`);

  console.log("\nSeed complete.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
