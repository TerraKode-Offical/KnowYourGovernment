import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

// ─────────────────────────────────────────────
// Rate-limit tiers (requests per 60-second window)
// ─────────────────────────────────────────────
const PUBLIC_LIMIT    = 60;   // /api/search, /api/bills, etc.
const PROTECTED_LIMIT = 300;  // /api/ai/* and /api/cron/*
const WINDOW_SEC      = 60;

// Only the configured site origin may call the API cross-origin (finding H-3).
const ALLOWED_ORIGIN = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_BASE_URL ?? "https://knowyourgov.us")
      .origin;
  } catch {
    return "https://knowyourgov.us";
  }
})();

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    // Use the RIGHTMOST entry in x-forwarded-for — it is the one appended by
    // the infrastructure closest to the server and hardest to spoof.
    request.headers.get("x-forwarded-for")?.split(",").pop()?.trim() ??
    "unknown"
  );
}

function tooManyRequests(retryAfter: number): NextResponse {
  return NextResponse.json(
    { error: "Too many requests. Please slow down." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  );
}

/**
 * Constant-time string comparison.
 * Prevents timing attacks that leak secret length or content.
 * Works in Edge Runtime (no Node.js crypto required).
 */
function timingSafeCompare(a: string, b: string): boolean {
  const maxLen = Math.max(a.length, b.length);
  let mismatch = 0;
  for (let i = 0; i < maxLen; i++) {
    mismatch |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  // Mask in the length difference so timing is identical for all lengths.
  mismatch |= a.length ^ b.length;
  return mismatch === 0;
}

// ─────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname, searchParams } = request.nextUrl;
  const ip = getClientIP(request);

  // ── CORS preflight ──────────────────────────────────────────────────
  if (request.method === "OPTIONS" && pathname.startsWith("/api/")) {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
        "Vary": "Origin",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  const isCron    = pathname.startsWith("/api/cron/");
  const isAi      = pathname.startsWith("/api/ai/");
  const isProtected = isAi || isCron;

  if (isProtected) {
    // ── Dev manual trigger (bypasses auth for local testing) ────────────
    // Requires ALLOW_MANUAL_CRON=true explicitly set in .env.
    // NEVER set this in production.
    if (isCron && searchParams.get("manual") === "true") {
      // Aligned with the route handlers: manual triggers are DEV-ONLY.
      if (process.env.NODE_ENV !== "development") {
        return NextResponse.json(
          { error: "Manual trigger is disabled outside development" },
          { status: 403 }
        );
      }
      if (process.env.ALLOW_MANUAL_CRON === "true") {
        return NextResponse.next();
      }
    }

    // ── AI routes: require Bearer token (always) ────────────────────────
    if (isAi) {
      const cronSecret = process.env.CRON_SECRET?.trim();
      if (!cronSecret) {
        return NextResponse.json(
          { error: "Server misconfiguration" },
          { status: 500 }
        );
      }

      const authHeader = request.headers.get("Authorization");
      const bearerToken = authHeader?.startsWith("Bearer ")
        ? authHeader.slice(7)
        : null;

      if (!bearerToken || !timingSafeCompare(bearerToken, cronSecret)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    // ── Cron routes: require auth ───────────────────────────────────────
    // All cron requests must provide a valid Bearer token or ?secret= query
    // param. Host crontab calls curl with the Bearer header.
    if (isCron) {
      const cronSecret = process.env.CRON_SECRET?.trim();
      const authHeader = request.headers.get("Authorization");
      const bearerToken = authHeader?.startsWith("Bearer ")
        ? authHeader.slice(7)
        : null;
      const queryToken = searchParams.get("secret");
      const token = bearerToken ?? queryToken;
      if (!token || !cronSecret || !timingSafeCompare(token, cronSecret)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    // ── Rate-limit protected routes ─────────────────────────────────────
    const { allowed, retryAfter } = await checkRateLimit(
      `auth:${ip}`,
      PROTECTED_LIMIT,
      WINDOW_SEC
    );
    if (!allowed) return tooManyRequests(retryAfter);
  } else if (pathname === "/api/subscribe" && request.method === "POST") {
    // ── Stricter rate limit on subscribe endpoint ───────────────────────
    const { allowed, retryAfter } = await checkRateLimit(
      `sub:${ip}`,
      5, // 5 requests per 60s
      60
    );
    if (!allowed) return tooManyRequests(retryAfter);
  } else {
    // ── Rate-limit public API routes ────────────────────────────────────
    const { allowed, retryAfter } = await checkRateLimit(
      `pub:${ip}`,
      PUBLIC_LIMIT,
      WINDOW_SEC
    );
    if (!allowed) return tooManyRequests(retryAfter);
  }

  const response = NextResponse.next();

  // ── CORS headers for API routes ─────────────────────────────────────
  if (pathname.startsWith("/api/")) {
    response.headers.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
    response.headers.set("Vary", "Origin");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }

  return response;
}

export const config = {
  // Node.js runtime is required because the rate limiter uses ioredis (a
  // native TCP client), which is not available in the Edge runtime.
  runtime: "nodejs",
  // Cover all API routes — rate limiting public, auth + rate limiting protected
  matcher: ["/api/:path*"],
};
