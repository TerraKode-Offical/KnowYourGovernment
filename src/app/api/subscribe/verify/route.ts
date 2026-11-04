import { prisma } from "@/lib/db";
import { BASE_URL } from "@/lib/resend";
import { withErrorHandler, ValidationError, NotFoundError } from "@/lib/api-error-handler";

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// GET /api/subscribe/verify?token=xxx
// Returns an HTML page (not JSON) since users click this from email
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function htmlPage(title: string, message: string, cta?: string): Response {
  const safeTitle = escapeHtml(title);
  const safeMessage = escapeHtml(message);
  const safeCta = cta ? escapeHtml(cta) : `<a href="${BASE_URL}" style="display:inline-block;background:#1B2A4A;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;">Go to KnowYourGov</a>`;
  return new Response(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${safeTitle} â€” KnowYourGov</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f3f4f6;display:flex;justify-content:center;align-items:center;min-height:100vh;">
  <div style="max-width:440px;text-align:center;padding:40px 24px;">
    <h1 style="color:#1B2A4A;font-size:24px;margin:0 0 12px;">${safeTitle}</h1>
    <p style="color:#4b5563;font-size:16px;line-height:1.6;margin:0 0 24px;">${safeMessage}</p>
    ${safeCta}
  </div>
</body>
</html>`,
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

export const GET = withErrorHandler(async (request: Request) => {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token")?.trim();

    if (!token) {
      return htmlPage("Invalid Link", "This verification link is missing or malformed.");
    }

    const subscriber = await prisma.subscriber.findUnique({
      where: { verificationToken: token },
    });

    if (!subscriber) {
      return htmlPage("Invalid Link", "This verification link is invalid or has expired.");
    }

    if (subscriber.verified) {
      return htmlPage(
        "Already Verified",
        "Your email is already confirmed. You're all set to receive updates!"
      );
    }

    // Links expire so a leaked/forwarded email cannot be used indefinitely.
    const TOKEN_TTL_MS = 48 * 60 * 60 * 1000;
    if (Date.now() - subscriber.createdAt.getTime() > TOKEN_TTL_MS) {
      return htmlPage(
        "Link Expired",
        "This verification link has expired. Subscribe again to receive a fresh link."
      );
    }

    await prisma.subscriber.update({
      where: { id: subscriber.id },
      data: { verified: true, verifiedAt: new Date() },
    });

    return htmlPage(
      "You're Subscribed!",
      "Your email has been confirmed. You'll receive civic updates for your state â€” bills, deadlines, and Supreme Court decisions, explained in plain English."
    );
  } catch (error) {
    console.error("[verify] Error:", error);
    return htmlPage("Something Went Wrong", "Please try again later.");
  }
}, { route: "GET /api/subscribe/verify" });
