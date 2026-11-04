// ─────────────────────────────────────────────
// Request hardening for public write endpoints
//
// Browsers always send Origin on cross-origin POSTs; requiring it to match
// the site origin blocks classic CSRF. Content-Type is pinned to JSON so a
// cross-site HTML form (which can only send urlencoded/plain text) cannot
// reach the handler. Bodies are size-capped to prevent memory abuse.
// ─────────────────────────────────────────────

import { ForbiddenError, ValidationError } from "@/lib/errors";

const DEFAULT_MAX_BODY_BYTES = 16 * 1024;

function siteOrigin(): string {
  try {
    return new URL(process.env.NEXT_PUBLIC_BASE_URL ?? "https://knowyourgov.us")
      .origin;
  } catch {
    return "https://knowyourgov.us";
  }
}

/**
 * Reject cross-site writes. Requests without an Origin header (server-to-server,
 * cron, curl) are allowed; browsers cannot omit Origin on cross-origin POSTs.
 */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (origin && origin !== siteOrigin()) {
    throw new ForbiddenError("This request must come from the KnowYourGov site.");
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") {
    throw new ForbiddenError("This request must come from the KnowYourGov site.");
  }
}

/** Require application/json so simple HTML form posts cannot reach handlers. */
export function assertJsonContentType(request: Request): void {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new ValidationError("Content-Type must be application/json.");
  }
}

/** Read and parse a JSON body with a hard size cap. */
export async function readJsonBody<T = Record<string, unknown>>(
  request: Request,
  maxBytes: number = DEFAULT_MAX_BODY_BYTES
): Promise<T> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new ValidationError("Request body is too large.");
  }

  const raw = await request.text();
  if (raw.length > maxBytes) {
    throw new ValidationError("Request body is too large.");
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new ValidationError("Invalid JSON body.");
  }
}

/**
 * Honeypot check. The forms include a hidden `website` field that real users
 * never fill; bots that auto-fill every input trip it.
 */
export function assertNoHoneypot(body: Record<string, unknown>): void {
  const trap = body.website;
  if (typeof trap === "string" && trap.trim().length > 0) {
    throw new ValidationError("Submission rejected.");
  }
}
