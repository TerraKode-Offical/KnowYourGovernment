import { BASE_URL } from "@/lib/resend";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface DigestBill {
  externalId: string;
  title: string;
  status: string;
  isNew: boolean;
}

export interface DigestDeadline {
  label: string;
  date: string;
  daysUntil: number;
}

export interface DigestCase {
  name: string;
  oyezId: string;
  status: string;
  aiSummary: string | null;
}

export interface DigestEmailParams {
  stateName: string;
  stateAbbr: string;
  bills: DigestBill[];
  deadlines: DigestDeadline[];
  cases: DigestCase[];
  unsubscribeToken: string;
}

// ─────────────────────────────────────────────
// Builder
// ─────────────────────────────────────────────

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function section(title: string, body: string): string {
  return `
    <div style="margin-bottom:24px;">
      <h3 style="margin:0 0 12px;color:#1B2A4A;font-size:16px;font-weight:700;border-bottom:2px solid #e5e7eb;padding-bottom:8px;">
        ${title}
      </h3>
      ${body}
    </div>`;
}

function billRow(bill: DigestBill): string {
  const badge = bill.isNew
    ? '<span style="background:#dcfce7;color:#166534;font-size:11px;padding:2px 6px;border-radius:4px;font-weight:600;">NEW</span>'
    : '<span style="background:#fef3c7;color:#92400e;font-size:11px;padding:2px 6px;border-radius:4px;font-weight:600;">UPDATED</span>';
  return `
    <div style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
      <div style="font-size:13px;color:#6b7280;margin-bottom:2px;">
        ${escapeHtml(bill.externalId)} · ${escapeHtml(bill.status.replace(/_/g, " "))} ${badge}
      </div>
      <div style="font-size:14px;color:#1f2937;font-weight:500;">${escapeHtml(bill.title)}</div>
    </div>`;
}

function deadlineRow(d: DigestDeadline): string {
  const urgency = d.daysUntil <= 3 ? "color:#dc2626;font-weight:700;" : "color:#1B2A4A;";
  return `
    <div style="padding:8px 0;border-bottom:1px solid #f3f4f6;display:flex;justify-content:space-between;">
      <span style="font-size:14px;color:#1f2937;">${escapeHtml(d.label)}</span>
      <span style="font-size:13px;${urgency}">${escapeHtml(d.date)} (${d.daysUntil} day${d.daysUntil !== 1 ? "s" : ""})</span>
    </div>`;
}

function caseRow(c: DigestCase): string {
  const url = `${BASE_URL}/judicial/cases/${c.oyezId}`;
  return `
    <div style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
      <div style="font-size:14px;color:#1f2937;font-weight:500;">
        <a href="${url}" style="color:#1B2A4A;text-decoration:underline;">${escapeHtml(c.name)}</a>
      </div>
      ${c.aiSummary ? `<div style="font-size:13px;color:#6b7280;margin-top:4px;line-height:1.4;">${escapeHtml(c.aiSummary.slice(0, 200))}...</div>` : ""}
    </div>`;
}

export function buildDigestEmail(params: DigestEmailParams): {
  subject: string;
  html: string;
} {
  const { stateName, stateAbbr, bills, deadlines, cases, unsubscribeToken } = params;
  const unsubUrl = `${BASE_URL}/api/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;
  const stateUrl = `${BASE_URL}/state/${stateAbbr.toLowerCase()}`;

  const sections: string[] = [];

  if (deadlines.length > 0) {
    sections.push(
      section(
        `Upcoming Deadlines — ${escapeHtml(stateName)}`,
        deadlines.map(deadlineRow).join("")
      )
    );
  }

  if (bills.length > 0) {
    sections.push(
      section(
        `Bills — ${escapeHtml(stateName)}`,
        bills.slice(0, 10).map(billRow).join("") +
          (bills.length > 10
            ? `<p style="font-size:13px;color:#6b7280;margin-top:8px;">+ ${bills.length - 10} more — <a href="${stateUrl}/bills" style="color:#1B2A4A;">view all</a></p>`
            : "")
      )
    );
  }

  if (cases.length > 0) {
    sections.push(
      section("Supreme Court", cases.slice(0, 5).map(caseRow).join(""))
    );
  }

  const totalItems = bills.length + deadlines.length + cases.length;
  const subject = deadlines.length > 0
    ? `${stateName}: ${deadlines.length} upcoming deadline${deadlines.length !== 1 ? "s" : ""} + ${totalItems - deadlines.length} update${totalItems - deadlines.length !== 1 ? "s" : ""}`
    : `${stateName}: ${totalItems} civic update${totalItems !== 1 ? "s" : ""} this week`;

  return {
    subject,
    html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f3f4f6;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="background:#1B2A4A;padding:20px 32px;">
      <h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:700;">InformedVoter</h1>
      <p style="margin:4px 0 0;color:rgba(255,255,255,0.6);font-size:13px;">Your ${escapeHtml(stateName)} civic digest</p>
    </div>
    <div style="padding:24px 32px;">
      ${sections.join("")}
      <div style="margin-top:24px;text-align:center;">
        <a href="${stateUrl}" style="display:inline-block;background:#1B2A4A;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:10px 24px;border-radius:8px;">
          View Your State Dashboard
        </a>
      </div>
    </div>
    <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;line-height:1.5;">
        You're receiving this because you subscribed to ${escapeHtml(stateName)} updates on InformedVoter.<br>
        <a href="${unsubUrl}" style="color:#6b7280;text-decoration:underline;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>`,
  };
}
