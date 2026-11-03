import { prisma } from "@/lib/db";
import { resend, EMAIL_FROM, BASE_URL } from "@/lib/resend";
import { verifyCronSecret } from "@/lib/auth";
import { acquireLock } from "@/lib/rate-limit";
import { withCronErrorHandler, ValidationError, NotFoundError } from "@/lib/api-error-handler";
import {
  buildDigestEmail,
  type DigestBill,
  type DigestDeadline,
  type DigestCase,
} from "@/lib/email/digest-template";

// ─────────────────────────────────────────────
// GET /api/cron/send-digest
//
// Daily digest cron — sends personalized emails to verified subscribers.
// Only sends when there's actual news for their state + topics.
// ─────────────────────────────────────────────

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

const DEFAULT_LOOKBACK_DAYS = 7;

export const GET = withCronErrorHandler(async (request: Request) => {
  if (!verifyCronSecret(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hasLock = await acquireLock("send-digest", 600);
  if (!hasLock) {
    return Response.json(
      { error: "Another instance is already running" },
      { status: 423 }
    );
  }

  if (!resend) {
    return Response.json({
      error: "Email sending is not configured (RESEND_API_KEY missing)",
    }, { status: 500 });
  }

  try {
    const subscribers = await prisma.subscriber.findMany({
      where: { verified: true },
    });

    if (subscribers.length === 0) {
      return Response.json({ success: true, sent: 0, skipped: 0, message: "No verified subscribers." });
    }

    // Warn if approaching Resend free tier limit
    if (subscribers.length > 80) {
      console.warn(
        `[send-digest] ${subscribers.length} subscribers — approaching Resend free tier limit (3,000/month)`
      );
    }

    // Group subscribers by state for efficient querying
    const byState = new Map<string, typeof subscribers>();
    for (const sub of subscribers) {
      const group = byState.get(sub.stateAbbr) ?? [];
      group.push(sub);
      byState.set(sub.stateAbbr, group);
    }

    // Pre-fetch SCOTUS cases (shared across all subscribers)
    const oldestLookback = new Date();
    oldestLookback.setDate(oldestLookback.getDate() - DEFAULT_LOOKBACK_DAYS);

    let scotusCases: DigestCase[] = [];
    try {
      const cases = await prisma.courtCase.findMany({
        where: {
          status: "DECIDED",
          dateDecided: { gte: oldestLookback },
        },
        select: { name: true, oyezId: true, status: true, aiSummary: true },
        orderBy: { dateDecided: "desc" },
        take: 10,
      });
      scotusCases = cases.map((c) => ({
        name: c.name,
        oyezId: c.oyezId,
        status: c.status,
        aiSummary: c.aiSummary,
      }));
    } catch {
      // Table may not exist yet
    }

    let sent = 0;
    let skipped = 0;
    let errors = 0;

    for (const [stateAbbr, subs] of byState) {
      // Resolve state ID
      const state = await prisma.state.findUnique({
        where: { abbreviation: stateAbbr },
        select: { id: true },
      });

      // Find the earliest lastDigestAt in this state group for the query window
      const earliestDigest = subs.reduce<Date>((earliest, s) => {
        const d = s.lastDigestAt ?? oldestLookback;
        return d < earliest ? d : earliest;
      }, new Date());

      // Fetch bills for this state since the earliest lookback
      let stateBills: DigestBill[] = [];
      if (state) {
        try {
          const bills = await prisma.bill.findMany({
            where: {
              stateId: state.id,
              OR: [
                { createdAt: { gte: earliestDigest } },
                { updatedAt: { gte: earliestDigest } },
              ],
            },
            select: { externalId: true, title: true, status: true, createdAt: true },
            orderBy: { updatedAt: "desc" },
            take: 20,
          });
          stateBills = bills.map((b) => ({
            externalId: b.externalId,
            title: b.title,
            status: b.status,
            isNew: b.createdAt >= earliestDigest,
          }));
        } catch {
          // OK — bills table may be empty
        }
      }

      // Fetch upcoming deadlines for this state
      let stateDeadlines: DigestDeadline[] = [];
      if (state) {
        try {
          const now = new Date();
          const twoWeeksOut = new Date();
          twoWeeksOut.setDate(now.getDate() + 14);

          const deadlines = await prisma.voterInfoDeadline.findMany({
            where: {
              voterInfo: { stateId: state.id },
              deadlineDate: { gte: now, lte: twoWeeksOut },
            },
            include: { election: { select: { name: true } } },
            orderBy: { deadlineDate: "asc" },
          });

          stateDeadlines = deadlines.map((d) => {
            const daysUntil = Math.ceil(
              (d.deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            );
            return {
              label: `${d.deadlineType.replace(/_/g, " ")} — ${d.election.name}`,
              date: d.deadlineDate.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              }),
              daysUntil,
            };
          });
        } catch {
          // OK
        }
      }

      // Send to each subscriber in this state group
      for (const sub of subs) {
        const subLookback = sub.lastDigestAt ?? oldestLookback;

        // Filter content by this subscriber's topics and timing
        const bills = sub.topics.includes("BILLS")
          ? stateBills.filter(
              (b) => b.isNew || true // all bills since state lookback
            )
          : [];
        const deadlines = sub.topics.includes("ELECTIONS")
          ? stateDeadlines
          : [];
        const cases = sub.topics.includes("SCOTUS") ? scotusCases : [];

        // Skip if nothing to send
        if (bills.length === 0 && deadlines.length === 0 && cases.length === 0) {
          skipped++;
          continue;
        }

        try {
          const stateName = STATE_NAMES[stateAbbr] ?? stateAbbr;
          const { subject, html } = buildDigestEmail({
            stateName,
            stateAbbr,
            bills,
            deadlines,
            cases,
            unsubscribeToken: sub.unsubscribeToken,
          });

          const unsubUrl = `${BASE_URL}/api/unsubscribe?token=${encodeURIComponent(sub.unsubscribeToken)}`;

          await resend.emails.send({
            from: EMAIL_FROM,
            to: sub.email,
            subject,
            html,
            headers: {
              "List-Unsubscribe": `<${unsubUrl}>`,
              "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            },
          });

          await prisma.subscriber.update({
            where: { id: sub.id },
            data: { lastDigestAt: new Date() },
          });

          sent++;
        } catch (err) {
          // Do not log subscriber email addresses (PII). Log an opaque id only.
          console.error(`[send-digest] Error sending to subscriber id=${sub.id}:`, err);
          errors++;
        }
      }
    }

    console.log(
      `[send-digest] Done: ${sent} sent, ${skipped} skipped (no news), ${errors} errors`
    );

    return Response.json({ success: true, sent, skipped, errors });
  } catch (error) {
    console.error("[send-digest] Unexpected error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}, { route: "GET /api/cron/send-digest", jobName: "send-digest" });
