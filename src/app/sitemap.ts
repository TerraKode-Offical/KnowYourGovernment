import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { FEDERAL_AGENCIES } from "@/lib/agencies";

const BASE_URL = "https://knowyourgov.us";

// The dynamic sections below query the database. This route must render at
// request time (not statically during the Docker image build, which has no
// DATABASE_URL) or those sections are permanently empty (finding F-3).
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // ── Static pages ──
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE_URL}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/contact`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE_URL}/polling-places`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/compare`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE_URL}/agencies`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/judicial`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
  ];

  // ── Agency pages ──
  const agencyPages: MetadataRoute.Sitemap = FEDERAL_AGENCIES.map((a) => ({
    url: `${BASE_URL}/agencies/${a.abbreviation.toLowerCase()}`,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  // ── State pages ──
  let statePages: MetadataRoute.Sitemap = [];
  try {
    const states = await prisma.state.findMany({
      select: { abbreviation: true },
    });
    statePages = states.flatMap((s) => {
      const abbr = s.abbreviation.toLowerCase();
      return [
        { url: `${BASE_URL}/state/${abbr}`, changeFrequency: "daily" as const, priority: 0.9 },
        { url: `${BASE_URL}/state/${abbr}/bills`, changeFrequency: "daily" as const, priority: 0.7 },
        { url: `${BASE_URL}/state/${abbr}/senators`, changeFrequency: "weekly" as const, priority: 0.7 },
        { url: `${BASE_URL}/state/${abbr}/representatives`, changeFrequency: "weekly" as const, priority: 0.7 },
        { url: `${BASE_URL}/state/${abbr}/governor`, changeFrequency: "weekly" as const, priority: 0.6 },
        { url: `${BASE_URL}/state/${abbr}/elections`, changeFrequency: "weekly" as const, priority: 0.7 },
        { url: `${BASE_URL}/state/${abbr}/voter-info`, changeFrequency: "monthly" as const, priority: 0.6 },
      ];
    });
  } catch {
    // DB may not be available during build
  }

  // ── Justice pages ──
  let justicePages: MetadataRoute.Sitemap = [];
  try {
    const justices = await prisma.justice.findMany({
      where: { isActive: true },
      select: { oyezIdentifier: true },
    });
    justicePages = justices.map((j) => ({
      url: `${BASE_URL}/judicial/justices/${j.oyezIdentifier}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
  } catch {
    // Table may not exist yet
  }

  // ── Case pages ──
  let casePages: MetadataRoute.Sitemap = [];
  try {
    const cases = await prisma.courtCase.findMany({
      select: { oyezId: true, dateDecided: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 500,
    });
    casePages = cases.map((c) => ({
      url: `${BASE_URL}/judicial/cases/${c.oyezId}`,
      lastModified: c.dateDecided ?? c.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
  } catch {
    // Table may not exist yet
  }

  // ── Candidate pages ──
  let candidatePages: MetadataRoute.Sitemap = [];
  try {
    const candidates = await prisma.candidate.findMany({
      select: { id: true, updatedAt: true },
      take: 1000,
    });
    candidatePages = candidates.map((c) => ({
      url: `${BASE_URL}/candidate/${c.id}`,
      lastModified: c.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
  } catch {
    // DB may not be available
  }

  return [
    ...staticPages,
    ...agencyPages,
    ...statePages,
    ...justicePages,
    ...casePages,
    ...candidatePages,
  ];
}
