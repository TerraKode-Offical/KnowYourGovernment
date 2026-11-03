// ─────────────────────────────────────────────
// Enums — mirroring Prisma schema
// ─────────────────────────────────────────────

export enum OfficeType {
  PRESIDENT = "PRESIDENT",
  US_SENATOR = "US_SENATOR",
  US_REPRESENTATIVE = "US_REPRESENTATIVE",
  GOVERNOR = "GOVERNOR",
  STATE_SENATOR = "STATE_SENATOR",
  STATE_REP = "STATE_REP",
  OTHER = "OTHER",
}

export enum PolicyCategory {
  ECONOMY = "ECONOMY",
  HEALTHCARE = "HEALTHCARE",
  EDUCATION = "EDUCATION",
  IMMIGRATION = "IMMIGRATION",
  ENVIRONMENT = "ENVIRONMENT",
  GUN_POLICY = "GUN_POLICY",
  FOREIGN_POLICY = "FOREIGN_POLICY",
  CRIMINAL_JUSTICE = "CRIMINAL_JUSTICE",
  HOUSING = "HOUSING",
  OTHER = "OTHER",
}

export enum Chamber {
  HOUSE = "HOUSE",
  SENATE = "SENATE",
}

export enum BillStatus {
  INTRODUCED = "INTRODUCED",
  IN_COMMITTEE = "IN_COMMITTEE",
  PASSED_HOUSE = "PASSED_HOUSE",
  PASSED_SENATE = "PASSED_SENATE",
  SIGNED = "SIGNED",
  VETOED = "VETOED",
  FAILED = "FAILED",
}

export enum VoteChoice {
  YES = "YES",
  NO = "NO",
  ABSTAIN = "ABSTAIN",
  NOT_VOTING = "NOT_VOTING",
}

export enum ElectionType {
  PRIMARY = "PRIMARY",
  GENERAL = "GENERAL",
  SPECIAL = "SPECIAL",
  RUNOFF = "RUNOFF",
}

export enum BookmarkEntityType {
  BILL = "BILL",
  CANDIDATE = "CANDIDATE",
}

export enum DonorType {
  INDIVIDUAL = "INDIVIDUAL",
  PAC = "PAC",
  PARTY = "PARTY",
  COMMITTEE = "COMMITTEE",
}

export enum ContributionSizeRange {
  UNDER_200 = "UNDER_200",
  R200_TO_499 = "R200_TO_499",
  R500_TO_999 = "R500_TO_999",
  R1000_TO_2999 = "R1000_TO_2999",
  R3000_PLUS = "R3000_PLUS",
}

export enum ExpenditureCategory {
  MEDIA = "MEDIA",
  PAYROLL = "PAYROLL",
  TRAVEL = "TRAVEL",
  CONSULTING = "CONSULTING",
  FUNDRAISING = "FUNDRAISING",
  OTHER = "OTHER",
}

export enum SupportOrOppose {
  SUPPORT = "SUPPORT",
  OPPOSE = "OPPOSE",
}

export enum DeadlineType {
  REGISTRATION = "REGISTRATION",
  EARLY_VOTING_START = "EARLY_VOTING_START",
  EARLY_VOTING_END = "EARLY_VOTING_END",
  ABSENTEE_REQUEST = "ABSENTEE_REQUEST",
  ABSENTEE_RETURN = "ABSENTEE_RETURN",
  ELECTION_DAY = "ELECTION_DAY",
}

export enum SubscriberTopic {
  BILLS = "BILLS",
  ELECTIONS = "ELECTIONS",
  SCOTUS = "SCOTUS",
}

// ─────────────────────────────────────────────
// Common UI interfaces
// ─────────────────────────────────────────────

export interface StateInfo {
  id: number;
  name: string;
  abbreviation: string;
  fipsCode: string;
}

export interface CandidateInfo {
  id: number;
  name: string;
  party: string;
  photoUrl: string | null;
  biography: string | null;
  websiteUrl: string | null;
  officeType: OfficeType;
  district: string | null;
  isIncumbent: boolean;
  stateId: number | null;
  state?: StateInfo;
}

export interface BillInfo {
  id: number;
  externalId: string;
  title: string;
  shortTitle: string | null;
  chamber: Chamber;
  status: BillStatus;
  introducedDate: string;
  lastActionDate: string | null;
  executiveSummary: string | null;
  sponsorId: number | null;
  fullTextUrl: string | null;
  congressGovUrl: string | null;
  subjects: string[];
  stateId: number | null;
}

export interface ElectionInfo {
  id: number;
  name: string;
  date: string;
  electionType: ElectionType;
  stateId: number | null;
  description: string | null;
}

export interface VoterInfoData {
  stateId: number;
  registrationDeadline: string | null;
  registrationUrl: string | null;
  earlyVotingStart: string | null;
  earlyVotingEnd: string | null;
  absenteeDeadline: string | null;
  absenteeUrl: string | null;
  pollingHoursStart: string | null;
  pollingHoursEnd: string | null;
  voterIdRequirements: string | null;
  onlineRegistration: boolean;
  sameDayRegistration: boolean;
  additionalNotes: string | null;
  stateElectionWebsite: string | null;
  electionProtectionHotline: string;
}

export interface CampaignFinanceData {
  candidateId: number;
  fecCandidateId: string | null;
  cycle: number;
  totalRaised: number;
  totalSpent: number;
  cashOnHand: number;
  totalDebt: number;
  individualContributions: number;
  pacContributions: number;
  partyContributions: number;
  selfFunding: number;
  smallDonorTotal: number;
  largeDonorTotal: number;
}
