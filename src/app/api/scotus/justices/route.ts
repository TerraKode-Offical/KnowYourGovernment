import { prisma } from "@/lib/db";
import { withErrorHandler, ValidationError, NotFoundError } from "@/lib/api-error-handler";

// ─────────────────────────────────────────────
// GET /api/scotus/justices?active=true
// ─────────────────────────────────────────────

export const GET = withErrorHandler(async (request: Request) => {
  try {
    const { searchParams } = new URL(request.url);
    const activeParam = searchParams.get("active")?.trim().toLowerCase();

    const where: Record<string, unknown> = {};
    if (activeParam === "true") where.isActive = true;
    if (activeParam === "false") where.isActive = false;

    const justices = await prisma.justice.findMany({
      where,
      select: {
        id: true,
        oyezIdentifier: true,
        name: true,
        firstName: true,
        lastName: true,
        photoUrl: true,
        roleTitle: true,
        appointingPresident: true,
        partyOfPresident: true,
        dateStart: true,
        dateEnd: true,
        isActive: true,
        ideologyScore: true,
        _count: {
          select: {
            votes: true,
            gifts: true,
            reimbursements: true,
          },
        },
      },
      orderBy: [{ isActive: "desc" }, { dateStart: "desc" }],
      take: 200,
    });

    return Response.json({ justices });
  } catch (error) {
    console.error("[scotus/justices] Unexpected error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}, { route: "GET /api/scotus/justices" });
