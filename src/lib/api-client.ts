// ─────────────────────────────────────────────
// Client-side API helpers
// ─────────────────────────────────────────────

/**
 * Extract a human-readable message from an API error payload.
 *
 * The server's error handler returns `{ success: false, message, code }`,
 * while a few legacy routes return `{ error: "..." }`. Accept both so a
 * 503 "temporarily unavailable" is shown verbatim instead of a generic
 * fallback.
 */
export function apiErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;

    if (typeof record.message === "string" && record.message.trim()) {
      return record.message;
    }
    if (typeof record.error === "string" && record.error.trim()) {
      return record.error;
    }
    if (record.error && typeof record.error === "object") {
      const nested = record.error as Record<string, unknown>;
      if (typeof nested.message === "string" && nested.message.trim()) {
        return nested.message;
      }
    }
  }
  return fallback;
}
