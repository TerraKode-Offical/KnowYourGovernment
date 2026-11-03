// Route catalogue discovered during Phase 1 inventory.
// `h1` is a regex asserting the primary heading (accessible landmark) is present.

export interface RouteDef {
  path: string;
  name: string;
  status?: number;
  h1?: RegExp;
}

// Static + data-backed pages expected to render 200.
export const PUBLIC_ROUTES: RouteDef[] = [
  { path: "/", name: "home", h1: /Your Government, In Plain English/i },
  { path: "/about", name: "about", h1: /About InformedVoter/i },
  { path: "/bills", name: "bills", h1: /Federal Bills/i },
  { path: "/elections", name: "elections", h1: /Upcoming Elections/i },
  { path: "/judicial", name: "judicial", h1: /Supreme Court/i },
  { path: "/judicial/cases/2024/23-1141", name: "case-detail" },
  { path: "/judicial/justices/clarence_thomas", name: "justice-detail" },
  { path: "/local", name: "local", h1: /Local Action Center/i },
  { path: "/local/rules", name: "local-rules", h1: /Rules for Speaking/i },
  { path: "/local/templates", name: "local-templates", h1: /Speaking Templates/i },
  { path: "/voter-info", name: "voter-info", h1: /Voter Information/i },
  { path: "/polling-places", name: "polling-places", h1: /Polling Place Finder/i },
  { path: "/compare", name: "compare", h1: /Compare Candidates/i },
  { path: "/agencies", name: "agencies" },
  { path: "/agencies/epa", name: "agency-detail" },
  { path: "/pac-recipients", name: "pac-recipients", h1: /PAC Tracker/i },
  { path: "/pac-recipients/aipac", name: "pac-detail" },
  { path: "/privacy", name: "privacy" },
  { path: "/contact", name: "contact" },
  { path: "/state/ca", name: "state-ca", h1: /California/i },
  { path: "/state/ca/senators", name: "state-ca-senators", h1: /U\.S\. Senators/i },
  { path: "/state/ca/representatives", name: "state-ca-representatives" },
  { path: "/state/ca/governor", name: "state-ca-governor", h1: /Governor/i },
  { path: "/state/ca/bills", name: "state-ca-bills", h1: /Bills/i },
  { path: "/state/ca/elections", name: "state-ca-elections", h1: /Elections/i },
  { path: "/state/ca/voter-info", name: "state-ca-voter-info" },
];

// Deep-link variants that must resolve to the same page as the base route.
export const DEEP_LINKS: Array<{ from: string; to: string }> = [
  { from: "/", to: "/bills" },
  { from: "/", to: "/judicial" },
  { from: "/local", to: "/local/rules" },
];
