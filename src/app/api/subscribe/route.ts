import { prisma } from "@/lib/db";
import { resend, EMAIL_FROM } from "@/lib/resend";
import { buildVerificationEmail } from "@/lib/email/verification-template";
import { withErrorHandler, ValidationError, ServiceUnavailableError } from "@/lib/api-error-handler";
import { isEmailConfigured } from "@/lib/config";
import { allowOnce } from "@/lib/rate-limit";
import {
  assertSameOrigin,
  assertJsonContentType,
  assertNoHoneypot,
  readJsonBody,
} from "@/lib/request-guard";

// ─────────────────────────────────────────────
// POST /api/subscribe
// Body: { email: string, stateAbbr: string, website?: "" }
// ─────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_COOLDOWN_SEC = 10 * 60;

const VALID_STATES = new Set([
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
]);

const GENERIC_RESPONSE = {
  success: true,
  message: "Check your email to confirm your subscription.",
};

export const POST = withErrorHandler(async (request: Request) => {
  assertSameOrigin(request);
  assertJsonContentType(request);

  const body = await readJsonBody<Record<string, unknown>>(request, 4 * 1024);
  assertNoHoneypot(body);

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const stateAbbr =
    typeof body.stateAbbr === "string" ? body.stateAbbr.trim().toUpperCase() : "";

  if (!email || !EMAIL_RE.test(email)) {
    throw new ValidationError("Please enter a valid email address.");
  }

  if (email.length > 254) {
    throw new ValidationError("Email address is too long.");
  }

  if (!stateAbbr || !VALID_STATES.has(stateAbbr)) {
    throw new ValidationError("Please select a valid US state.");
  }

  // Without an email provider we cannot complete double opt-in. Say so
  // honestly instead of storing an address that will never be confirmed.
  if (!isEmailConfigured() || !resend) {
    throw new ServiceUnavailableError(
      "Email updates are temporarily unavailable. Please check back soon."
    );
  }

  // Upsert: if already verified, silently succeed (no enumeration leak)
  // If unverified, regenerate token and re-send.
  const existing = await prisma.subscriber.findUnique({
    where: { email },
    select: { verified: true },
  });

  if (existing?.verified) {
    // Already subscribed — respond identically to prevent enumeration
    return Response.json(GENERIC_RESPONSE);
  }

  // Per-address throttle: stops inbox bombing from many source IPs.
  const maySend = await allowOnce(`subscribe:${email}`, RESEND_COOLDOWN_SEC);
  if (!maySend) {
    return Response.json(GENERIC_RESPONSE);
  }

  const subscriber = await prisma.subscriber.upsert({
    where: { email },
    create: { email, stateAbbr },
    update: {
      stateAbbr,
      verificationToken: crypto.randomUUID(),
      // Re-issuing a verification link restarts its 48h validity window.
      createdAt: new Date(),
    },
  });

  const { subject, html } = buildVerificationEmail(
    stateAbbr,
    subscriber.verificationToken
  );

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject,
      html,
    });
  } catch {
    // Never surface provider errors or the address to the client.
    throw new ServiceUnavailableError(
      "We couldn't send the confirmation email. Please try again shortly."
    );
  }

  // Never leak profileToken for unverified subscribers.
  // The token is only exposed after email verification.
  return Response.json(GENERIC_RESPONSE);
}, { route: "POST /api/subscribe" });
