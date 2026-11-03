import { timingSafeEqual } from "crypto";

/**
 * Timing-safe comparison of a provided bearer token or query secret against CRON_SECRET.
 * Prevents timing attacks that could leak the secret character by character.
 *
 * Checks the `Authorization: Bearer <token>` header first, then falls back to
 * the `?secret=<token>` query parameter (useful for host crontab / external schedulers).
 */
export function verifyCronSecret(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) return false;

  const authHeader = request.headers.get("Authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  const url = new URL(request.url);
  const queryToken = url.searchParams.get("secret");

  const token = bearerToken ?? queryToken;
  if (!token) return false;

  try {
    const a = Buffer.from(token);
    const b = Buffer.from(cronSecret);
    if (a.length !== b.length) {
      // Perform a dummy constant-time comparison so that the timing profile
      // is identical regardless of whether the token length matches the secret.
      const dummy = Buffer.alloc(b.length);
      timingSafeEqual(dummy, b);
      return false;
    }
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
