import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrorHandler, ValidationError, NotFoundError } from "@/lib/api-error-handler";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/local/meeting/:id
 * Get a single meeting with agenda items and municipality info.
 */
export const GET = withErrorHandler(async (_request: Request, { params }: RouteParams) => {
  const { id } = await params;

  const meeting = await prisma.localMeeting.findUnique({
    where: { id },
    include: {
      municipality: true,
      agendaItems: {
        orderBy: { itemNumber: "asc" },
      },
    },
  });

  if (!meeting) {
    throw new NotFoundError("Meeting not found");
  }

  return NextResponse.json({ meeting });
}, { route: "GET /api/local/meeting/:id" });
