import { completeJSON } from "./llmClient.js";
import { logger } from "../../utils/logger.js";

// ----------------------------------------------------------------------
// Memora Backend -- commitmentExtractor.js
// THIS IS THE CORE PRODUCT. Everything else in Memora -- the connectors,
// the RAG chat, the digest -- exists to feed this function or surface
// what it produces. The hard problem here isn't finding sentences that
// sound like promises; it's telling apart:
//   - hard commitments  ("I'll send it Friday")       -> must surface
//   - soft commitments  ("I'll try to get to it")     -> surface, low-key
//   - non-commitments   ("maybe we should sometime")  -> must NOT surface
// Getting this wrong in either direction kills the product: too many
// false positives and people mute it in a week; too few and it's just
// a worse to-do list. Confidence scoring + a hold-back threshold exist
// specifically so uncertain cases don't reach the user as false alarms.
// ----------------------------------------------------------------------

// Below this confidence, an extraction is discarded rather than shown --
// silence is the safe failure mode here, a false-positive nag is not.
export const CONFIDENCE_THRESHOLD = 0.6;

const EXTRACTION_SYSTEM_PROMPT = `You are the extraction engine inside Memora, a personal memory assistant. Your only job: read a piece of text (an email, chat message, or calendar event) and identify genuine COMMITMENTS the account owner made to someone else -- promises with an implied or explicit obligation to do something.

## What counts as a commitment
A commitment is a statement where the account owner is obligating themselves to a future action. Examples:
- "I'll send you the proposal by Friday" -- hard commitment, explicit deadline
- "I promise I'll get back to you tomorrow" -- hard commitment, explicit deadline
- "I'll try to review this sometime this week" -- soft commitment, vague deadline, lower confidence
- "Let me look into it and circle back" -- soft commitment, no explicit deadline

## What does NOT count as a commitment
- Questions, speculation, or brainstorming: "Maybe we should look at pricing sometime?"
- Someone ELSE promising the account owner something: "Priya said she'd send the report" is Priya's commitment, not the account owner's -- do not extract this
- Statements about the past: "I sent that yesterday"
- General opinions, greetings, or small talk
- Vague future intentions with no obligation to another person: "I should really clean my inbox"
- Calendar events that are just meetings/appointments, not promises (unless the event description itself contains a promise)

## Due date resolution
Resolve relative dates ("Friday", "next week", "EOD tomorrow") into an absolute ISO 8601 datetime using the message's "occurredAt" timestamp and "timezone" as the reference point -- NOT today's actual date. If no deadline is stated or implied, return null for dueDate (this is valid and common -- not every commitment has a deadline).

## Confidence scoring (0.0 to 1.0)
- 0.9-1.0: Explicit promise language ("I'll", "I promise", "I will") with a clear deadline
- 0.7-0.89: Clear obligation but vague timing, or clear timing but softer language
- 0.6-0.69: Plausible commitment but some ambiguity in who's obligated or whether it's genuine
- Below 0.6: Don't include it at all -- omit rather than guess

## Output format
Return a JSON array (empty array if no commitments found). Each item:
{
  "text": "Concise paraphrase of the commitment, third-person implied, under 15 words. E.g. 'Send the revised proposal to Priya'",
  "dueDate": "2026-08-15T18:00:00.000Z" or null,
  "confidence": 0.85,
  "sourceExcerpt": "The exact verbatim sentence(s) this was extracted from, for citation purposes. Max 200 characters."
}

Never invent a due date that isn't stated or clearly implied. Never extract the same commitment twice if it's repeated in the text. If genuinely nothing qualifies, return [].`;

/**
 * Extracts commitments from a single piece of source text.
 *
 * @param {object} input
 * @param {string} input.text - the raw message/email/event body
 * @param {string} input.sourceType - "email" | "calendar" | "chat" | "doc"
 * @param {Date|string} input.occurredAt - when this message was sent/created, for relative date resolution
 * @param {string} [input.timezone] - IANA timezone for resolving relative dates, defaults to UTC
 * @returns {Promise<Array<{text: string, dueDate: string|null, confidence: number, sourceExcerpt: string}>>}
 */
export async function extractCommitments({ text, sourceType, occurredAt, timezone = "UTC" }) {
  if (!text?.trim() || text.trim().length < 10) {
    return []; // too short to plausibly contain a commitment worth an LLM call
  }

  const occurredAtISO = new Date(occurredAt).toISOString();

  try {
    const result = await completeJSON({
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            `sourceType: ${sourceType}`,
            `occurredAt: ${occurredAtISO}`,
            `timezone: ${timezone}`,
            "",
            "text:",
            text.slice(0, 8000), // guard against pathologically long inputs blowing the context budget
          ].join("\n"),
        },
      ],
      maxTokens: 1024,
      temperature: 0.1, // low temperature -- this is extraction, not creative generation
    });

    if (!Array.isArray(result)) {
      logger.warn("commitmentExtractor: LLM returned non-array result", { sourceType });
      return [];
    }

    return result
      .filter((item) => isValidExtraction(item))
      .filter((item) => item.confidence >= CONFIDENCE_THRESHOLD)
      .map(normalizeExtraction);
  } catch (err) {
    // A single failed extraction should never take down a whole sync
    // run -- log and skip this document, don't throw up the call stack.
    logger.error("commitmentExtractor failed", { sourceType, error: err.message });
    return [];
  }
}

function isValidExtraction(item) {
  return (
    item &&
    typeof item.text === "string" &&
    item.text.trim().length > 0 &&
    typeof item.confidence === "number" &&
    item.confidence >= 0 &&
    item.confidence <= 1 &&
    (item.dueDate === null || !Number.isNaN(new Date(item.dueDate).getTime()))
  );
}

function normalizeExtraction(item) {
  return {
    text: item.text.trim().slice(0, 500),
    dueDate: item.dueDate ? new Date(item.dueDate) : null,
    confidence: item.confidence,
    sourceExcerpt: (item.sourceExcerpt || "").trim().slice(0, 1000),
  };
}

export default { extractCommitments, CONFIDENCE_THRESHOLD };