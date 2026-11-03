import { NextRequest, NextResponse } from "next/server";
import yaml from "js-yaml";
import { prisma } from "@/lib/db";
import { verifyCronSecret } from "@/lib/auth";
import { withCronErrorHandler, AuthenticationError } from "@/lib/api-error-handler";
import { logSync } from "@/lib/sync-log";

// ─────────────────────────────────────────────
// Cron: sync-social
//
// Populates Candidate.socialMedia (twitter / facebook / youtube / instagram)
// from the public `unitedstates/congress-legislators` dataset
// (legislators-social-media.yaml). Candidates are matched by the bioguideId
// stored in contactInfo by sync-members. No API key required.
//
// Authorization: Bearer CRON_SECRET
// ─────────────────────────────────────────────

const SOCIAL_YAML_URL =
  process.env.SOCIAL_YAML_URL ??
  "https://raw.githubusercontent.com/unitedstates/congress-legislators/main/legislators-social-media.yaml";

interface SocialMediaEntry {
  id?: { bioguide?: string; bioguideId?: string };
  social?: Record<string, string>;
  ids?: Record<string, string>;
}

function toUrl(platform: string, handle: string): string | null {
  const h = handle.trim();
  if (!h || h.startsWith("http")) return null;
  switch (platform) {
    case "twitter":
      return `https://x.com/${h}`;
    case "facebook":
      return `https://www.facebook.com/${h}`;
    case "instagram":
      return `https://www.instagram.com/${h}`;
    case "youtube":
      return h.startsWith("UC")
        ? `https://www.youtube.com/channel/${h}`
        : `https://www.youtube.com/@${h}`;
    default:
      return null;
  }
}

export const GET = withCronErrorHandler(async (request: NextRequest) => {
  if (!verifyCronSecret(request)) {
    throw new AuthenticationError("Unauthorized");
  }

  const startTime = Date.now();

  const res = await fetch(SOCIAL_YAML_URL, {
    headers: { "User-Agent": "InformedVoter/1.0 (civic data sync)" },
  });
  if (!res.ok) {
    return NextResponse.json(
      {
        success: false,
        code: "DATA_SOURCE_UNAVAILABLE",
        message: `Could not fetch social media dataset (HTTP ${res.status})`,
      },
      { status: 502 }
    );
  }

  const text = await res.text();
  const entries = (yaml.load(text) as SocialMediaEntry[]) ?? [];

  let matched = 0;
  let updated = 0;
  let unmatched = 0;
  const errors: string[] = [];

  for (const entry of entries) {
    const bioguide = entry.id?.bioguide ?? entry.id?.bioguideId;
    if (!bioguide) continue;

    const raw = entry.social ?? entry.ids ?? {};
    const social: Record<string, string> = {};
    for (const platform of ["twitter", "facebook", "instagram", "youtube"]) {
      const handle = raw[platform];
      if (!handle) continue;
      const url = toUrl(platform, handle);
      if (url) social[platform] = url;
    }
    if (Object.keys(social).length === 0) continue;

    try {
      const candidate = await prisma.candidate.findFirst({
        where: {
          contactInfo: { path: ["bioguideId"], equals: bioguide },
        },
        select: { id: true, socialMedia: true },
      });
      if (!candidate) {
        unmatched++;
        continue;
      }
      matched++;

      const existing =
        (candidate.socialMedia as Record<string, string> | null) ?? {};
      const merged = { ...existing, ...social };

      await prisma.candidate.update({
        where: { id: candidate.id },
        data: { socialMedia: merged },
      });
      updated++;
    } catch (err) {
      errors.push(`${bioguide}: ${err instanceof Error ? err.message : "unknown"}`);
    }
  }

  await logSync({
    syncType: "social",
    status: errors.length > 0 ? "partial" : "success",
    recordsTotal: entries.length,
    recordsSynced: updated,
    recordsFailed: errors.length,
    durationMs: Date.now() - startTime,
    metadata: { matched, unmatched: entries.length - matched },
  });

  return NextResponse.json({
    success: true,
    datasetEntries: entries.length,
    matched,
    updated,
    unmatched,
    errors: errors.slice(0, 10),
    durationMs: Date.now() - startTime,
  });
}, { route: "GET /api/cron/sync-social", jobName: "sync-social" });
