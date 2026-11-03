import { prisma } from "@/lib/db";
import { BASE_URL } from "@/lib/resend";
// Note: This route returns HTML pages, not JSON, so we don't use withErrorHandler here.
// Errors are handled internally with friendly HTML error pages.

// ─────────────────────────────────────────────
// GET /api/unsubscribe?token=xxx  → Confirmation page
// POST /api/unsubscribe?token=xxx → Perform deletion (RFC 8058 one-click)
// ─────────────────────────────────────────────

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function htmlPage(title: string, message: string, status = 200): Response {
  const safeTitle = escapeHtml(title);
  const safeMessage = escapeHtml(message);
  return new Response(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${safeTitle} — InformedVoter</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f3f4f6;display:flex;justify-content:center;align-items:center;min-height:100vh;">
  <div style="max-width:440px;text-align:center;padding:40px 24px;">
    <h1 style="color:#1B2A4A;font-size:24px;margin:0 0 12px;">${safeTitle}</h1>
    <p style="color:#4b5563;font-size:16px;line-height:1.6;margin:0 0 24px;">${safeMessage}</p>
    <a href="${BASE_URL}" style="display:inline-block;background:#1B2A4A;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;">Go to InformedVoter</a>
  </div>
</body>
</html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

async function handleUnsubscribe(request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token")?.trim();

    if (!token) {
      return htmlPage("Invalid Link", "This unsubscribe link is missing or malformed.", 400);
    }

    const subscriber = await prisma.subscriber.findUnique({
      where: { unsubscribeToken: token },
    });

    if (!subscriber) {
      return htmlPage("Invalid Link", "This unsubscribe link is invalid or has already been used.", 400);
    }

    // GET shows a confirmation page; POST performs the deletion.
    // This prevents CSRF via image tags, link prefetching, etc.
    if (request.method === "GET") {
      return new Response(
        `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Unsubscribe — InformedVoter</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f3f4f6;display:flex;justify-content:center;align-items:center;min-height:100vh;">
  <div style="max-width:440px;text-align:center;padding:40px 24px;">
    <h1 style="color:#1B2A4A;font-size:24px;margin:0 0 12px;">Unsubscribe</h1>
    <p style="color:#4b5563;font-size:16px;line-height:1.6;margin:0 0 24px;">Click the button below to confirm you want to unsubscribe from InformedVoter emails.</p>
    <form method="POST" action="${BASE_URL}/api/unsubscribe?token=${encodeURIComponent(token)}">
      <button type="submit" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;border:none;cursor:pointer;">Confirm Unsubscribe</button>
    </form>
    <p style="color:#9ca3af;font-size:13px;margin-top:16px;">Changed your mind? <a href="${BASE_URL}" style="color:#6b7280;">Go back to InformedVoter</a></p>
  </div>
</body>
</html>`,
        { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    // POST — perform the actual deletion
    await prisma.subscriber.delete({ where: { id: subscriber.id } });

    return htmlPage(
      "You've Been Unsubscribed",
      "We're sorry to see you go. You won't receive any more emails from InformedVoter."
    );
  } catch (error) {
    console.error("[unsubscribe] Error:", error);
    return htmlPage("Something Went Wrong", "Please try again later.", 500);
  }
}

export const GET = handleUnsubscribe;
export const POST = handleUnsubscribe;
