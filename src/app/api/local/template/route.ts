import { NextRequest, NextResponse } from "next/server";
import { generateSpeakingTemplate } from "@/lib/ai/claude-client";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  withErrorHandler,
  ValidationError,
  RateLimitError,
  ServiceUnavailableError,
} from "@/lib/api-error-handler";
import { isAiConfigured } from "@/lib/config";
import {
  assertSameOrigin,
  assertJsonContentType,
  readJsonBody,
} from "@/lib/request-guard";

const VALID_TONES = new Set(["professional", "assertive"]);

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",").pop()?.trim() ??
    "unknown"
  );
}

/**
 * POST /api/local/template
 * Body: { agendaItemTitle, agendaItemDescription, tone: "professional" | "assertive" }
 *
 * Stricter rate limit: 5 requests per hour per IP because each call
 * invokes Claude Sonnet (expensive API credits).
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  assertSameOrigin(request);
  assertJsonContentType(request);

  if (!isAiConfigured()) {
    throw new ServiceUnavailableError(
      "AI speaking templates are temporarily unavailable. Please check back soon."
    );
  }

  const ip = getClientIP(request);
  const { allowed, retryAfter } = await checkRateLimit(
    `ai-template:${ip}`,
    5,     // 5 requests
    3600   // per hour
  );
  if (!allowed) {
    throw new RateLimitError("Too many requests. Please try again later.", { retryAfter });
  }

  const body = await readJsonBody<Record<string, unknown>>(request, 8 * 1024);
  const title = typeof body.agendaItemTitle === "string" ? body.agendaItemTitle.trim() : "";
  const description =
    typeof body.agendaItemDescription === "string"
      ? body.agendaItemDescription.trim().slice(0, 2000)
      : "";
  const tone = typeof body.tone === "string" ? body.tone : "";

  if (!title || title.length > 500 || !VALID_TONES.has(tone)) {
    throw new ValidationError("agendaItemTitle (max 500 chars) and tone ('professional' or 'assertive') are required");
  }

  const template = await generateSpeakingTemplate({
    agendaItemTitle: title,
    agendaItemDescription: description,
    tone: tone as "professional" | "assertive",
  });

  return NextResponse.json({ template });
}, { route: "POST /api/local/template" });
