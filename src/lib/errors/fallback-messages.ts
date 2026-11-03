// ─────────────────────────────────────────────
// Fallback Messages by HTTP Status Code
//
// Manually written, user-friendly messages for every status.
// NEVER auto-generated from external sources.
// ─────────────────────────────────────────────

const FALLBACK_MESSAGES: Record<number, string> = {
  400: "That request didn't look quite right. Please check your input and try again.",
  401: "Sorry, but you aren't authorized to be here.",
  403: "Sorry, but you aren't authorized to be here.",
  404: "Sorry, but we can't find that anywhere on this site.",
  429: "Whoa there — too many requests. Please slow down and try again in a moment.",
  500: "We're experiencing a technical issue. Please try again later.",
  502: "We're having trouble connecting to our data source. Please try again later.",
  503: "Service temporarily unavailable. Please try again later.",
};

/**
 * Returns a manually written user-friendly message for the given HTTP status code.
 * Falls back to a generic message for unknown codes.
 */
export function getFallbackMessage(statusCode: number): string {
  return (
    FALLBACK_MESSAGES[statusCode] ??
    "Something went wrong. Please try again later."
  );
}
