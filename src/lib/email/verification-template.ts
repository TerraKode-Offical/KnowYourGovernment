import { BASE_URL } from "@/lib/resend";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi",
  MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire",
  NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina",
  ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
  RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee",
  TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington",
  WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming", DC: "District of Columbia",
};

export function buildVerificationEmail(
  stateAbbr: string,
  token: string
): { subject: string; html: string } {
  const stateName = STATE_NAMES[stateAbbr.toUpperCase()] ?? stateAbbr;
  const verifyUrl = `${BASE_URL}/api/subscribe/verify?token=${encodeURIComponent(token)}`;

  return {
    subject: `Confirm your InformedVoter subscription — ${stateName}`,
    html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f3f4f6;">
  <div style="max-width:520px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="background:#1B2A4A;padding:24px 32px;">
      <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">InformedVoter</h1>
    </div>
    <div style="padding:32px;">
      <h2 style="margin:0 0 12px;color:#1B2A4A;font-size:18px;">Confirm your subscription</h2>
      <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 8px;">
        You asked for updates about <strong>${escapeHtml(stateName)}</strong> — bills, election deadlines,
        and Supreme Court decisions, explained in plain English.
      </p>
      <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 24px;">
        Click the button below to confirm your email:
      </p>
      <a href="${verifyUrl}" style="display:inline-block;background:#1B2A4A;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:8px;">
        Confirm Subscription
      </a>
      <p style="color:#9ca3af;font-size:12px;margin:24px 0 0;line-height:1.5;">
        If you didn't request this, you can safely ignore this email.
        You won't receive any further messages.
      </p>
    </div>
  </div>
</body>
</html>`,
  };
}
