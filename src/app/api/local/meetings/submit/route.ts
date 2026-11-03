import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  withErrorHandler,
  ValidationError,
  RateLimitError,
} from "@/lib/api-error-handler";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  assertSameOrigin,
  assertJsonContentType,
  assertNoHoneypot,
  readJsonBody,
} from "@/lib/request-guard";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STATE_REGEX = /^[A-Z]{2}$/;
const TIME_REGEX = /^[0-9]{1,2}(:[0-9]{2})?\s*(am|pm)?$/i;

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",").pop()?.trim() ??
    "unknown"
  );
}

/**
 * POST /api/local/meetings/submit
 * Accepts community-submitted meeting information for review.
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  assertSameOrigin(request);
  assertJsonContentType(request);

  // Tighter than the global API limit: this endpoint writes to the database.
  const { allowed, retryAfter } = await checkRateLimit(
    `meeting-submit:${getClientIP(request)}`,
    5,
    3600
  );
  if (!allowed) {
    throw new RateLimitError("Too many submissions. Please try again later.", {
      retryAfter,
    });
  }

  const body = await readJsonBody<Record<string, unknown>>(request, 12 * 1024);
  assertNoHoneypot(body);

  const city = typeof body.city === "string" ? body.city.trim() : "";
  const state = typeof body.state === "string" ? body.state.trim().toUpperCase() : "";
  const date = typeof body.date === "string" ? body.date.trim() : "";
  const location = typeof body.location === "string" ? body.location.trim() : "";
  const time = typeof body.time === "string" ? body.time.trim() : "";
  const agenda = typeof body.agenda === "string" ? body.agenda.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";

  if (!city || !state || !date || !location) {
    throw new ValidationError("City, state, date, and location are required");
  }

  if (!STATE_REGEX.test(state)) {
    throw new ValidationError("State must be a 2-letter US state abbreviation");
  }

  const meetingDate = new Date(date);
  if (isNaN(meetingDate.getTime())) {
    throw new ValidationError("Invalid date format");
  }

  // Reject absurd dates (typos or abuse): one year back to three years ahead.
  const now = Date.now();
  if (
    meetingDate.getTime() < now - 365 * 24 * 60 * 60 * 1000 ||
    meetingDate.getTime() > now + 3 * 365 * 24 * 60 * 60 * 1000
  ) {
    throw new ValidationError("Meeting date is outside the accepted range");
  }

  if (email && !EMAIL_REGEX.test(email)) {
    throw new ValidationError("Invalid email format");
  }

  if (city.length > 100) {
    throw new ValidationError("City name must be 100 characters or less");
  }
  if (location.length > 200) {
    throw new ValidationError("Location must be 200 characters or less");
  }
  if (agenda.length > 5000) {
    throw new ValidationError("Agenda must be 5000 characters or less");
  }
  if (time && (!TIME_REGEX.test(time) || time.length > 20)) {
    throw new ValidationError("Start time must look like 7:00 PM");
  }
  if (email.length > 254) {
    throw new ValidationError("Email address is too long");
  }

  await prisma.submittedMeeting.create({
    data: {
      city,
      state,
      meetingDate,
      startTime: time || null,
      location,
      agenda: agenda || null,
      email: email || null,
      status: "pending",
    },
  });

  // Do not echo the stored row (which contains the submitter's email).
  return NextResponse.json({
    success: true,
    message: "Thanks! Your submission is queued for review.",
  });
}, { route: "POST /api/local/meetings/submit" });
