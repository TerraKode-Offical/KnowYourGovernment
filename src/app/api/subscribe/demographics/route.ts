import { prisma } from "@/lib/db";
import { withErrorHandler, ValidationError, NotFoundError } from "@/lib/api-error-handler";
import {
  assertSameOrigin,
  assertJsonContentType,
  readJsonBody,
} from "@/lib/request-guard";

// ─────────────────────────────────────────────
// POST /api/subscribe/demographics
// Body: { profileToken, ...demographics }
// ─────────────────────────────────────────────

const VALID_PARTY = new Set([
  "Democrat",
  "Republican",
  "Independent",
  "Libertarian",
  "Green Party",
  "No Party Preference",
  "Other",
]);

const VALID_AGE_RANGE = new Set([
  "18-24",
  "25-34",
  "35-44",
  "45-54",
  "55-64",
  "65+",
]);

const VALID_ETHNICITY = new Set([
  "White/Caucasian",
  "Black/African American",
  "Hispanic/Latino",
  "Asian/Pacific Islander",
  "Native American/Alaska Native",
  "Middle Eastern/North African",
  "Multiracial",
  "Other",
  "Prefer not to say",
]);

const VALID_GENDER = new Set([
  "Male",
  "Female",
  "Non-binary",
  "Prefer not to say",
]);

const VALID_EDUCATION = new Set([
  "High school or less",
  "Some college",
  "Associate's degree",
  "Bachelor's degree",
  "Master's degree",
  "Doctoral/Professional degree",
]);

const VALID_VOTING_FREQUENCY = new Set([
  "Every election",
  "Most elections",
  "Occasionally",
  "Rarely/Never",
  "First-time voter",
]);

const VALID_ISSUES = new Set([
  "Economy & Jobs",
  "Healthcare",
  "Education",
  "Environment & Climate",
  "Immigration",
  "Gun Policy",
  "Criminal Justice",
  "Foreign Policy",
  "Social Security & Medicare",
  "Civil Rights",
  "Housing & Cost of Living",
  "Infrastructure",
]);

const VALID_REFERRAL = new Set([
  "Social media",
  "Search engine",
  "Friend or family",
  "News article",
  "Other",
]);

const ZIP_RE = /^\d{5}(-\d{4})?$/;

function validateOptional<T>(
  value: unknown,
  allowed: Set<T>
): T | undefined {
  if (value == null || value === "") return undefined;
  if (allowed.has(value as T)) return value as T;
  return undefined;
}

export const POST = withErrorHandler(async (request: Request) => {
  assertSameOrigin(request);
  assertJsonContentType(request);

  const body = await readJsonBody<Record<string, unknown>>(request, 8 * 1024);

  const profileToken =
    typeof body.profileToken === "string" ? body.profileToken.trim() : "";

  if (!profileToken) {
    throw new ValidationError("Missing profile token.");
  }

  // Find subscriber by profile token
  const subscriber = await prisma.subscriber.findUnique({
    where: { profileToken },
    select: { id: true, profileCompletedAt: true },
  });

  if (!subscriber) {
    throw new NotFoundError("Invalid profile token.");
  }

  // Validate & sanitize all fields
  const partyAffiliation = validateOptional(body.partyAffiliation, VALID_PARTY);
  const ageRange = validateOptional(body.ageRange, VALID_AGE_RANGE);
  const ethnicity = validateOptional(body.ethnicity, VALID_ETHNICITY);
  const gender = validateOptional(body.gender, VALID_GENDER);
  const educationLevel = validateOptional(body.educationLevel, VALID_EDUCATION);
  const votingFrequency = validateOptional(body.votingFrequency, VALID_VOTING_FREQUENCY);
  const referralSource = validateOptional(body.referralSource, VALID_REFERRAL);

  const zipCode =
    typeof body.zipCode === "string" && ZIP_RE.test(body.zipCode.trim())
      ? body.zipCode.trim()
      : undefined;

  const communityService =
    typeof body.communityService === "boolean"
      ? body.communityService
      : undefined;

  const issuesOfInterest = Array.isArray(body.issuesOfInterest)
    ? (body.issuesOfInterest as unknown[]).filter((i) =>
        VALID_ISSUES.has(i as string)
      ) as string[]
    : [];

  await prisma.subscriber.update({
    where: { id: subscriber.id },
    data: {
      partyAffiliation,
      ageRange,
      ethnicity,
      gender,
      zipCode,
      educationLevel,
      communityService,
      votingFrequency,
      issuesOfInterest,
      referralSource,
      profileCompletedAt: new Date(),
    },
  });

  return Response.json({
    success: true,
    message: "Thank you for sharing! This helps us serve you better.",
  });
}, { route: "POST /api/subscribe/demographics" });
