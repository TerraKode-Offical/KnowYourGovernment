import Redis from "ioredis";

// ─────────────────────────────────────────────
// Redis client (native, on-prem) — ioredis
// Gracefully absent if REDIS_URL is not set.
// Reused across hot reloads in dev via globalThis.
// ─────────────────────────────────────────────

const globalForRedis = globalThis as unknown as { ivRedis?: Redis | null };

function createRedis(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  const client = new Redis(url, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    lazyConnect: false,
    retryStrategy: (times) => Math.min(times * 200, 2000),
  });
  // Never crash the server on a Redis blip; calls fail open below.
  client.on("error", () => {});
  return client;
}

const redis = globalForRedis.ivRedis ?? createRedis();
if (process.env.NODE_ENV !== "production") globalForRedis.ivRedis = redis;

// ─────────────────────────────────────────────
// Fixed-window rate limiter
//
// Returns { allowed: true } when the request should proceed.
// Returns { allowed: false } when the limit is exceeded.
// Falls back to allowing all requests when Redis is not configured or
// unreachable, so the app continues to work without Redis.
// ─────────────────────────────────────────────

export interface RateLimitResult {
  allowed: boolean;
  /** Approximate remaining requests in the current window */
  remaining: number;
  /** Seconds until the current window resets */
  retryAfter: number;
}

/**
 * @param identifier  Unique key, e.g. `pub:${ip}` or `auth:${ip}`
 * @param limit       Max requests allowed per window
 * @param windowSec   Window duration in seconds
 */
export async function checkRateLimit(
  identifier: string,
  limit: number,
  windowSec: number
): Promise<RateLimitResult> {
  if (!redis) {
    return { allowed: true, remaining: limit, retryAfter: 0 };
  }

  try {
    const window = Math.floor(Date.now() / (windowSec * 1000));
    const key = `rl:${identifier}:${window}`;

    // `set key 0 EX windowSec NX` + `incr key` in a single MULTI transaction.
    // The NX guarantees only the first request in a window sets the TTL, while
    // every request safely increments.
    const results = await redis
      .multi()
      .set(key, "0", "EX", windowSec, "NX")
      .incr(key)
      .exec();

    const count = Number(results?.[1]?.[1] ?? 0);

    const remaining = Math.max(0, limit - count);
    const secondsIntoWindow = (Date.now() / 1000) % windowSec;
    const retryAfter = Math.ceil(windowSec - secondsIntoWindow);

    return { allowed: count <= limit, remaining, retryAfter };
  } catch {
    // Redis error — fail open to avoid blocking legitimate users
    return { allowed: true, remaining: limit, retryAfter: 0 };
  }
}

/**
 * Acquire a distributed lock via Redis SET NX EX.
 * Returns `true` if the lock was acquired, `false` if it is already held.
 * Automatically expires after `ttlSec` to prevent deadlocks.
 */
export async function acquireLock(key: string, ttlSec: number): Promise<boolean> {
  if (!redis) return true; // Fail open if Redis is unavailable
  try {
    const acquired = await redis.set(`lock:${key}`, "1", "EX", ttlSec, "NX");
    return acquired === "OK";
  } catch {
    return true; // Fail open on Redis error
  }
}

/**
 * Per-identity cooldown (e.g. one email per address per 10 minutes).
 * Returns `true` when the action is allowed (first hit in the window) and
 * `false` when it is throttled.
 *
 * Fails CLOSED: if Redis is unavailable we return `false` so that email
 * sending cannot be used as an open relay. Callers that must not be blocked
 * by an outage should not use this helper.
 */
export async function allowOnce(
  key: string,
  ttlSec: number
): Promise<boolean> {
  if (!redis) return false;
  try {
    const acquired = await redis.set(`once:${key}`, "1", "EX", ttlSec, "NX");
    return acquired === "OK";
  } catch {
    return false;
  }
}
