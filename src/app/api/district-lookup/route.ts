import { withErrorHandler, ValidationError, NotFoundError } from "@/lib/api-error-handler";
// ─────────────────────────────────────────────
// GET /api/district-lookup?address=<url-encoded address>
// Uses the Google Civic Information API representativeInfoByAddress
// endpoint to look up the congressional district and representatives.
// ─────────────────────────────────────────────

interface CivicOfficial {
  name?: string;
  party?: string;
  phones?: string[];
  urls?: string[];
  photoUrl?: string;
  channels?: Array<{ type: string; id: string }>;
}

interface CivicOffice {
  name?: string;
  divisionId?: string;
  levels?: string[];
  roles?: string[];
  officialIndices?: number[];
}

interface CivicRepresentativeResponse {
  offices?: CivicOffice[];
  officials?: CivicOfficial[];
  normalizedInput?: {
    line1?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  error?: { code?: number; message?: string };
}

export const GET = withErrorHandler(async (request: Request) => {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address")?.trim();

    if (!address) {
      throw new ValidationError("Query parameter 'address' is required");
    }

    if (address.length > 500) {
      throw new ValidationError("Address is too long (max 500 characters)");
    }

    const apiKey = process.env.GOOGLE_CIVIC_API_KEY;
    if (!apiKey) {
      return Response.json(
        {
          districts: [],
          notice: "District lookup is not configured on this server. Please visit your state page to browse representatives.",
        },
        { status: 200 }
      );
    }

    const civicUrl = new URL(
      "https://www.googleapis.com/civicinfo/v2/representatives"
    );
    civicUrl.searchParams.set("key", apiKey);
    civicUrl.searchParams.set("address", address);
    // Only request congressional-level offices
    civicUrl.searchParams.set("levels", "country");
    civicUrl.searchParams.set("roles", "legislatorLowerBody");

    const res = await fetch(civicUrl.toString(), {
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      const errorMessage: string =
        errorBody?.error?.message ?? "Google Civic API request failed";

      if (res.status === 404) {
        return Response.json(
          {
            districts: [],
            notice: "No district information found for this address.",
          },
          { status: 200 }
        );
      }

      return Response.json({ error: "District lookup service error" }, { status: 502 });
    }

    const data: CivicRepresentativeResponse = await res.json();

    // Extract congressional district info
    const districts: Array<{
      office: string;
      district: string | null;
      representative: string;
      party: string | null;
    }> = [];

    if (data.offices && data.officials) {
      for (const office of data.offices) {
        // Extract district number from division ID (e.g., "ocd-division/country:us/state:ca/cd:7")
        const divisionId = office.divisionId ?? "";
        const cdMatch = divisionId.match(/\/cd:(\d+)/);
        const districtNumber = cdMatch ? cdMatch[1] : null;

        if (office.officialIndices) {
          for (const idx of office.officialIndices) {
            const official = data.officials[idx];
            if (official) {
              districts.push({
                office: office.name ?? "U.S. Representative",
                district: districtNumber,
                representative: official.name ?? "Unknown",
                party: official.party ?? null,
              });
            }
          }
        }
      }
    }

    return Response.json({
      districts,
      normalizedAddress: data.normalizedInput ?? null,
    });
}, { route: "GET /api/district-lookup" });
