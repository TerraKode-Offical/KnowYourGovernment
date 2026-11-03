import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrorHandler, ValidationError, NotFoundError } from "@/lib/api-error-handler";

/**
 * GET /api/local/meetings?municipalityId=...&upcoming=true
 * List meetings for a municipality.
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const municipalityId = searchParams.get("municipalityId")?.trim();
  const upcoming = searchParams.get("upcoming") === "true";

  if (!municipalityId) {
    throw new ValidationError("municipalityId is required");
  }

  const meetings = await prisma.localMeeting.findMany({
    where: {
      municipalityId,
      ...(upcoming
        ? {
            meetingDate: { gte: new Date() },
            status: "scheduled",
          }
        : {}),
    },
    include: {
      agendaItems: true,
    },
    orderBy: { meetingDate: "asc" },
  });

  return NextResponse.json({ meetings });
}, { route: "GET /api/local/meetings" });
