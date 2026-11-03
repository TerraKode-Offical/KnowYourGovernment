import ContextualNotFound from "@/components/error/ContextualNotFound";

// ─────────────────────────────────────────────
// Root Not-Found Page
//
// Catches all 404s across the app and renders a contextual,
// on-brand, humorous message based on the URL path.
// ─────────────────────────────────────────────

export default function NotFoundPage() {
  return <ContextualNotFound />;
}
