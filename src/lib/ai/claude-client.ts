import Anthropic from "@anthropic-ai/sdk";
import { PolicyCategory, VoteChoice } from "@/types";
import { AIProcessingError } from "@/lib/errors";

// ─────────────────────────────────────────────
// Client initialisation
// ─────────────────────────────────────────────

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ─────────────────────────────────────────────
// Response types
// ─────────────────────────────────────────────

export interface BillAnalysis {
  executive_summary: string;
  detailed_summary: string;
  key_provisions: string[];
  affected_groups: string[];
  fiscal_impact: string;
  political_context: string;
}

export interface RiderDetectionResult {
  has_riders: boolean;
  riders: Array<{
    title: string;
    description: string;
    concern_level: "low" | "medium" | "high";
    page_reference?: string;
  }>;
  summary: string;
}

export interface CandidatePolicyAnalysis {
  category: PolicyCategory;
  summary: string;
  supporters_perspective: string;
  critics_perspective: string;
  key_votes: Array<{
    bill: string;
    vote: string;
    significance: string;
  }>;
  consistency_score: number; // 0-100
  notes: string;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Wrap untrusted user content so that attempts to inject instructions
 * are treated as data rather than commands. Any occurrence of the closing
 * tag inside the text is stripped to prevent premature tag closure.
 */
function wrapUserContent(text: string): string {
  const safe = text.replace(/<\/user_content>/gi, "");
  return `<user_content>\n${safe}\n</user_content>`;
}

/**
 * Parse the first JSON object or array found in a string.
 * Handles Claude responses that wrap JSON in markdown code fences.
 */
function extractJson<T>(text: string): T {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenceMatch ? fenceMatch[1] : text;
  try {
    return JSON.parse(raw.trim()) as T;
  } catch {
    throw new AIProcessingError("Unable to parse the analysis result. Please try again later.");
  }
}

function getTextContent(message: Anthropic.Message): string {
  const block = message.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new AIProcessingError("The analysis returned an unexpected format. Please try again later.");
  }
  return block.text;
}

// ─────────────────────────────────────────────
// analyzeBill
// ─────────────────────────────────────────────

/**
 * Produce a plain-language analysis of a legislative bill using Claude Haiku.
 */
export async function analyzeBill(
  title: string,
  text: string
): Promise<BillAnalysis> {
  const prompt = `You are a nonpartisan legislative analyst. Analyze the following bill and provide a clear, objective summary for everyday citizens.

Bill Title: ${wrapUserContent(title)}

Bill Text:
${wrapUserContent(text.slice(0, 15000))}${text.length > 15000 ? "\n\n[Text truncated for brevity]" : ""}

Respond with a JSON object matching this exact structure:
{
  "executive_summary": "2-3 sentence plain-language summary",
  "detailed_summary": "1-2 paragraph detailed explanation",
  "key_provisions": ["provision 1", "provision 2", "..."],
  "affected_groups": ["group 1", "group 2", "..."],
  "fiscal_impact": "Brief description of estimated cost or savings",
  "political_context": "Objective description of political background"
}

Be factual and nonpartisan. Do not editorialize or take sides.`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    return extractJson<BillAnalysis>(getTextContent(message));
  } catch (error) {
    if (error instanceof AIProcessingError) throw error;
    throw new AIProcessingError("Unable to analyze the bill at this time. Please try again later.");
  }
}

// ─────────────────────────────────────────────
// detectRiders
// ─────────────────────────────────────────────

/**
 * Detect unrelated "rider" provisions in a bill using Claude Sonnet.
 */
export async function detectRiders(
  title: string,
  summary: string,
  text: string
): Promise<RiderDetectionResult> {
  const prompt = `You are an expert legislative analyst specializing in identifying "riders" — provisions attached to a bill that are unrelated to its primary purpose.

Bill Title: ${wrapUserContent(title)}

Bill Summary: ${wrapUserContent(summary)}

Bill Text:
${wrapUserContent(text.slice(0, 20000))}${text.length > 20000 ? "\n\n[Text truncated for brevity]" : ""}

Analyze the bill text carefully and identify any provisions that:
1. Are unrelated or loosely related to the bill's primary stated purpose
2. Would not pass on their own merit as standalone legislation
3. Significantly expand the bill's scope beyond its title or summary

Respond with a JSON object matching this exact structure:
{
  "has_riders": true | false,
  "riders": [
    {
      "title": "Short name for the rider",
      "description": "What this provision does and why it appears unrelated",
      "concern_level": "low" | "medium" | "high",
      "page_reference": "Section or page reference if available"
    }
  ],
  "summary": "1-2 sentence overview of your findings"
}

If no riders are found, return an empty array for "riders" and set "has_riders" to false.`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    return extractJson<RiderDetectionResult>(getTextContent(message));
  } catch (error) {
    if (error instanceof AIProcessingError) throw error;
    throw new AIProcessingError("Unable to detect riders at this time. Please try again later.");
  }
}

// ─────────────────────────────────────────────
// analyzeCandidatePolicy
// ─────────────────────────────────────────────

export interface CandidatePolicyInput {
  name: string;
  party: string;
  office: string;
  category: PolicyCategory;
  votes: Array<{ bill: string; vote: VoteChoice; date?: string }>;
  statements: string[];
}

/**
 * Produce a balanced, nonpartisan policy analysis for a candidate on a given topic.
 */
export async function analyzeCandidatePolicy(
  input: CandidatePolicyInput
): Promise<CandidatePolicyAnalysis> {
  const { name, party, office, category, votes, statements } = input;

  const voteSummary =
    votes.length > 0
      ? votes
          .map(
            (v) =>
              `- ${v.bill}: ${v.vote}${v.date ? ` (${v.date})` : ""}`
          )
          .join("\n")
      : "No recorded votes available.";

  const statementSummary =
    statements.length > 0
      ? statements.map((s, i) => `${i + 1}. ${s}`).join("\n")
      : "No public statements available.";

  const prompt = `You are a nonpartisan political analyst. Analyze ${wrapUserContent(name)}'s (${wrapUserContent(party)}, ${wrapUserContent(office)}) position on ${wrapUserContent(category.replace(/_/g, " ").toLowerCase())} policy.

Voting Record:
${wrapUserContent(voteSummary)}

Public Statements:
${wrapUserContent(statementSummary)}

Provide a balanced, factual analysis that presents both how supporters and critics view this candidate's positions. Do not take sides.

Respond with a JSON object matching this exact structure:
{
  "category": "${category}",
  "summary": "2-3 sentence objective summary of their overall position",
  "supporters_perspective": "1-2 sentences on how supporters view their record",
  "critics_perspective": "1-2 sentences on how critics view their record",
  "key_votes": [
    {
      "bill": "Bill name or number",
      "vote": "YES | NO | ABSTAIN | NOT_VOTING",
      "significance": "Why this vote matters"
    }
  ],
  "consistency_score": 0-100,
  "notes": "Any additional context or caveats"
}

The consistency_score (0-100) reflects how consistently their votes align with their stated positions — it is not a quality judgment.`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    return extractJson<CandidatePolicyAnalysis>(getTextContent(message));
  } catch (error) {
    if (error instanceof AIProcessingError) throw error;
    throw new AIProcessingError("Unable to analyze candidate policy at this time. Please try again later.");
  }
}

// ─────────────────────────────────────────────
// analyzeCourtCase
// ─────────────────────────────────────────────

export interface CourtCaseAnalysis {
  plain_english_summary: string;
  impact_analysis: string;
}

/**
 * Produce a plain-English summary and impact analysis of a SCOTUS case.
 */
export async function analyzeCourtCase(
  caseName: string,
  question: string,
  facts: string,
  conclusion: string
): Promise<CourtCaseAnalysis> {
  const prompt = `You are a nonpartisan legal analyst writing for everyday Americans who are not lawyers.
Summarize this Supreme Court case in plain English so anyone can understand it.

Case: ${wrapUserContent(caseName)}

Question Presented:
${wrapUserContent(question.slice(0, 3000))}

Facts of the Case:
${wrapUserContent(facts.slice(0, 5000))}

Conclusion/Ruling:
${wrapUserContent(conclusion.slice(0, 5000))}

Return valid JSON matching this schema exactly:
{
  "plain_english_summary": "3-5 sentence summary that anyone can understand. Avoid legal jargon entirely. Explain what the case is about, what the court decided, and why it matters. Write as if explaining to a smart friend who doesn't follow the news.",
  "impact_analysis": "2-3 sentences explaining the real-world impact. How does this ruling affect ordinary people? What changes because of this decision? Be specific and practical."
}`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    return extractJson<CourtCaseAnalysis>(getTextContent(message));
  } catch (error) {
    if (error instanceof AIProcessingError) throw error;
    throw new AIProcessingError("Unable to summarize the court case at this time. Please try again later.");
  }
}

// ─────────────────────────────────────────────
// generateSpeakingTemplate
// ─────────────────────────────────────────────

export interface SpeakingTemplateInput {
  agendaItemTitle: string;
  agendaItemDescription: string;
  tone: "professional" | "assertive";
}

export interface SpeakingTemplate {
  opening: string;
  body: string;
  closing: string;
  key_facts: string[];
  suggested_questions: string[];
  tone: string;
}

/**
 * Generate a citizen speaking template for a city council agenda item.
 * The template argues AGAINST the proposal with hard facts.
 */
export async function generateSpeakingTemplate(
  input: SpeakingTemplateInput
): Promise<SpeakingTemplate> {
  const { agendaItemTitle, agendaItemDescription, tone } = input;

  const toneInstructions =
    tone === "professional"
      ? `Use a respectful, measured, fact-driven tone. Address council members as "Council members" or "Mayor and Council." Cite specific data. Ask pointed questions. Avoid profanity or personal attacks. Sound like a well-informed constituent who has done their homework.`
      : `Use a direct, unapologetic, constitutionally grounded tone. You are a taxpayer and citizen exercising your First Amendment right to petition government. Do not be rude, but do not grovel. Use strong language if warranted by the facts. Remind them they work for you. Reference your rights if challenged.`;

  const prompt = `You are a grassroots civic organizer helping citizens speak at city council meetings. Your job is to write a compelling, fact-based public comment script arguing AGAINST a specific agenda item.

AGENDA ITEM: ${wrapUserContent(agendaItemTitle)}
DESCRIPTION: ${wrapUserContent(agendaItemDescription || "No additional description provided.")}

Tone: ${wrapUserContent(tone)}

${toneInstructions}

Research the topic thoroughly. Provide hard facts, statistics, and real-world examples. If the topic involves:
- Flock cameras / surveillance: emphasize privacy violations, lack of crime reduction evidence, cost overruns, facial recognition risks, and normalization of a surveillance state.
- Data centers: emphasize water usage, energy grid strain, noise pollution, lack of local jobs, tax abatements that hurt schools, and environmental degradation.
- Zoning / development: emphasize community character, infrastructure strain, affordable housing loss, and developer influence.
- Policing / budgets: emphasize alternative investments, civilian oversight, and comparative statistics.

Respond with valid JSON matching this exact structure:
{
  "opening": "1-2 sentence hook introducing yourself and your stance",
  "body": "3-5 paragraphs of argument with facts, data, and examples. Write this as natural speech, not an essay. Use short sentences. Include pauses for effect.",
  "closing": "1-2 sentence strong closing with a clear ask or demand",
  "key_facts": ["fact 1 with source or statistic", "fact 2", "fact 3", "fact 4"],
  "suggested_questions": ["question 1 to ask council on the record", "question 2", "question 3"],
  "tone": "${tone}"
}

The body should be speakable in 2-3 minutes (roughly 300-450 words). Make it powerful and memorable.`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const result = extractJson<SpeakingTemplate>(getTextContent(message));

    // Basic runtime validation to guard against malformed model output
    if (
      typeof result.opening !== "string" ||
      typeof result.body !== "string" ||
      typeof result.closing !== "string" ||
      !Array.isArray(result.key_facts) ||
      !Array.isArray(result.suggested_questions)
    ) {
      throw new AIProcessingError("The generated template was incomplete. Please try again later.");
    }

    return result;
  } catch (error) {
    if (error instanceof AIProcessingError) throw error;
    throw new AIProcessingError("Unable to generate the speaking template at this time. Please try again later.");
  }
}
