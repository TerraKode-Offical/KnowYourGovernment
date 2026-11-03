// ─────────────────────────────────────────────
// Feature availability
//
// Several optional integrations (Claude analysis, transactional email,
// CourtListener disclosures) require API keys that may be absent in a
// given deployment. Routes must degrade gracefully instead of throwing
// 500s or silently claiming an email was sent.
// ─────────────────────────────────────────────

function present(value: string | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

/** Claude-backed analysis (bill/candidate/case summaries, speaking templates). */
export function isAiConfigured(): boolean {
  return present(process.env.ANTHROPIC_API_KEY);
}

/** Resend transactional email (verification + digest). */
export function isEmailConfigured(): boolean {
  return present(process.env.RESEND_API_KEY);
}

/** CourtListener financial-disclosure sync. */
export function isCourtListenerConfigured(): boolean {
  return present(process.env.COURTLISTENER_API_TOKEN);
}

/** Google Civic district / polling-place lookups. */
export function isCivicConfigured(): boolean {
  return present(process.env.GOOGLE_CIVIC_API_KEY);
}
