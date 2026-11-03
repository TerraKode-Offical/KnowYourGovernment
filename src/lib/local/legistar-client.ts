// ─────────────────────────────────────────────
// Legistar / Granicus API Client
// Docs: https://support.granicus.com/s/article/Legistar-Web-API
// ─────────────────────────────────────────────

import { ValidationError, ExternalAPIError } from "@/lib/errors";

const LEGISTAR_BASE = "https://webapi.legistar.com/v1";

// Alphanumeric, hyphen, and underscore only — prevents path traversal and SSRF.
const CLIENT_ID_REGEX = /^[a-zA-Z0-9_-]+$/;

interface LegistarEvent {
  EventId: number;
  EventGuid: string;
  EventLastModifiedUtc: string;
  EventBodyId: number;
  EventBodyName: string;
  EventDate: string;
  EventTime: string;
  EventLocation: string;
  EventAgendaFile: string | null;
  EventMinutesFile: string | null;
  EventAgendaStatusId: number | null;
  EventMinutesStatusId: number | null;
  EventAgendaStatusName: string | null;
  EventMinutesStatusName: string | null;
  EventVideoPath: string | null;
  EventInSiteURL: string | null;
}

interface LegistarMatter {
  MatterId: number;
  MatterFile: string;
  MatterName: string;
  MatterTitle: string | null;
  MatterTypeId: number | null;
  MatterTypeName: string | null;
  MatterStatusId: number | null;
  MatterBodyId: number;
  MatterBodyName: string;
  MatterIntroDate: string | null;
  MatterAgendaDate: string | null;
  MatterPassedDate: string | null;
  MatterEnactmentDate: string | null;
  MatterEnactmentNumber: string | null;
  MatterRequester: string | null;
  MatterNotes: string | null;
  MatterVersion: string | null;
  MatterText1: string | null;
  MatterText2: string | null;
  MatterText3: string | null;
  MatterText4: string | null;
  MatterText5: string | null;
  MatterDate1: string | null;
  MatterDate2: string | null;
  MatterEXText1: string | null;
  MatterEXText2: string | null;
  MatterEXText3: string | null;
  MatterEXText4: string | null;
  MatterEXText5: string | null;
  MatterEXDate1: string | null;
  MatterEXDate2: string | null;
}

function validateClientId(client: string): void {
  if (!CLIENT_ID_REGEX.test(client)) {
    throw new ValidationError("Invalid client identifier");
  }
}

/**
 * Escape a string for safe use inside an OData string literal.
 * OData escapes single quotes by doubling them.
 */
function escapeOdataString(value: string): string {
  return value.replace(/'/g, "''");
}

/**
 * Fetch upcoming events (meetings) for a Legistar client.
 */
export async function fetchLegistarEvents(
  client: string,
  options: { fromDate?: string; toDate?: string; bodyId?: number } = {}
): Promise<LegistarEvent[]> {
  validateClientId(client);
  const { fromDate, toDate, bodyId } = options;

  const params = new URLSearchParams();
  // OData-style filtering
  const filters: string[] = [];
  if (fromDate) filters.push(`EventDate ge datetime'${escapeOdataString(fromDate)}'`);
  if (toDate) filters.push(`EventDate le datetime'${escapeOdataString(toDate)}'`);
  if (bodyId) filters.push(`EventBodyId eq ${bodyId}`);

  if (filters.length > 0) {
    params.set("$filter", filters.join(" and "));
  }

  // Sort by date ascending
  params.set("$orderby", "EventDate asc");

  const url = `${LEGISTAR_BASE}/${client}/Events?${params.toString()}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 300 }, // 5 minutes cache for Next.js fetch
  });

  if (!res.ok) {
    throw new ExternalAPIError("Unable to fetch meeting data. Please try again later.", {
      context: { status: res.status, statusText: res.statusText },
    });
  }

  return res.json() as Promise<LegistarEvent[]>;
}

/**
 * Fetch matters (agenda items) for a specific event.
 */
export async function fetchLegistarEventItems(
  client: string,
  eventId: number
): Promise<LegistarMatter[]> {
  validateClientId(client);
  const url = `${LEGISTAR_BASE}/${client}/Events/${eventId}/EventItems`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    throw new ExternalAPIError("Unable to fetch agenda items. Please try again later.", {
      context: { status: res.status, statusText: res.statusText },
    });
  }

  return res.json() as Promise<LegistarMatter[]>;
}

/**
 * Map a Legistar event to our LocalMeeting shape.
 */
export function mapLegistarEventToMeeting(
  event: LegistarEvent,
  municipalityId: string
) {
  return {
    municipalityId,
    title: event.EventBodyName || "City Council Meeting",
    meetingDate: new Date(event.EventDate),
    startTime: event.EventTime
      ? event.EventTime.split("T")[1]?.slice(0, 5) || null
      : null,
    locationName: event.EventLocation || null,
    locationAddress: event.EventLocation || null,
    agendaUrl: event.EventAgendaFile || event.EventInSiteURL || null,
    sourceUrl: event.EventInSiteURL || null,
    sourceType: "legistar",
    status: "scheduled",
  };
}

/**
 * Map a Legistar matter (event item) to our MeetingAgendaItem shape.
 */
export function mapLegistarMatterToAgendaItem(matter: LegistarMatter) {
  return {
    title: matter.MatterName || "Untitled Agenda Item",
    description: matter.MatterTitle || matter.MatterNotes || null,
    itemNumber: matter.MatterFile || null,
  };
}
