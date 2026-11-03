"use client";

import { useEffect } from "react";

// ─────────────────────────────────────────────
// Global Error Boundary
//
// Replaces the entire document when an error escapes the root layout.
// It must render its own <html>/<body>. It NEVER exposes the raw error
// message, stack, digest, or any internal detail — only a friendly,
// witty, user-safe message and a retry action.
// ─────────────────────────────────────────────

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Server-side/structured logging happens elsewhere; log a generic marker
    // here without surfacing anything to the user.
    // eslint-disable-next-line no-console
    console.error("[GlobalError] Unhandled application error");
    void error;
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f3f4f6",
          color: "#1B2A4A",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          padding: "24px",
        }}
      >
        <main style={{ maxWidth: "440px", textAlign: "center" }}>
          <p style={{ fontSize: "56px", fontWeight: 900, opacity: 0.1, margin: 0 }}>
            500
          </p>
          <h1 style={{ fontSize: "24px", margin: "8px 0 12px" }}>
            Well, this is awkward
          </h1>
          <p style={{ color: "#4b5563", lineHeight: 1.6, margin: "0 0 24px" }}>
            Something broke on our end — and no, it wasn&apos;t your fault. Our
            servers are having a heated debate and couldn&apos;t reach a
            consensus. Give it another try.
          </p>
          <button
            onClick={reset}
            style={{
              background: "#1B2A4A",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: "12px 28px",
              fontSize: "15px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          <p style={{ color: "#9ca3af", fontSize: "13px", marginTop: "16px" }}>
            Still stuck? Head back to{" "}
            <a href="/" style={{ color: "#6b7280" }}>
              knowyourgov.us
            </a>
            .
          </p>
        </main>
      </body>
    </html>
  );
}
