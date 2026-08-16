import { embedOne } from "../embeddings/embeddingService.js";
import { vectorSearchEmbeddings } from "../../config/vectorSearch.js";
import { complete } from "./llmClient.js";
import { logger } from "../../utils/logger.js";

// ----------------------------------------------------------------------
// Memora Backend — ragQuery.js
// Passive recall: "Where did I save the Q3 budget file?" → embed the
// question → vector search the user's own indexed data → synthesize an
// answer grounded ONLY in what was retrieved, with citations. This is
// what chat.controller.js's `ask()` calls.
//
// The system prompt below is deliberately strict about not answering
// from general knowledge — a memory assistant that confidently makes
// things up about your own life is worse than one that says "I don't
// have that."
// ----------------------------------------------------------------------

const RETRIEVAL_LIMIT = 8;
const MIN_RELEVANCE_SCORE = 0.65; // below this, a chunk is considered noise, not a real match

const ANSWER_SYSTEM_PROMPT = `You are Memora, a personal memory assistant. You answer questions using ONLY the retrieved context provided below — snippets from the user's own emails, chats, calendar, and documents. You never use outside knowledge to answer factual questions about the user's life.

Rules:
- If the context answers the question, answer directly and conversationally, in the user's own frame of reference ("you paid...", "you agreed to...").
- If the context partially answers it, say what you found and be explicit about what's uncertain.
- If the context does NOT contain a relevant answer, say so plainly — do not guess or fabricate an answer. Something like "I don't see anything about that in what's connected" is the correct response, not a fabricated one.
- Keep answers concise — 2-4 sentences typically, more only if genuinely needed.
- Do not mention "the context" or "the retrieved chunks" in your answer — speak naturally, as if you simply remembered.
- If conversation history is provided, use it to resolve follow-up references ("what about next week?") but still ground the actual answer in the retrieved context for THIS turn.`;

/**
 * Answers a user's passive-recall question using RAG over their own
 * connected data.
 *
 * @param {object} input
 * @param {string} input.query
 * @param {string} input.userId
 * @param {Array<{role: string, text: string}>} [input.history] - recent turns, for follow-up context
 * @returns {Promise<{text: string, sources: Array}>}
 */
export async function answerQuery({ query, userId, history = [] }) {
  const queryEmbedding = await embedOne(query, { inputType: "query" });

  const matches = await vectorSearchEmbeddings(queryEmbedding, userId, {
    limit: RETRIEVAL_LIMIT,
    candidates: 100,
  });

  const relevantMatches = matches.filter((m) => m.score >= MIN_RELEVANCE_SCORE);

  if (relevantMatches.length === 0) {
    return {
      text: "I don't see anything about that in what's connected. It might be in an app I don't have access to yet, or it just hasn't come up.",
      sources: [],
    };
  }

  const contextBlock = relevantMatches
    .map((m, i) => `[${i + 1}] (${m.sourceType} — ${m.sourceLabel})\n${m.text}`)
    .join("\n\n");

  const historyBlock = history.length
    ? `Recent conversation:\n${history.map((h) => `${h.role}: ${h.text}`).join("\n")}\n\n`
    : "";

  let answerText;
  try {
    answerText = await complete({
      system: ANSWER_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `${historyBlock}Retrieved context:\n${contextBlock}\n\nQuestion: ${query}`,
        },
      ],
      maxTokens: 500,
      temperature: 0.3,
    });
  } catch (err) {
    logger.error("ragQuery answer generation failed", { userId, error: err.message });
    throw err;
  }

  return {
    text: answerText.trim(),
    sources: dedupeSources(relevantMatches),
  };
}

/**
 * Maps raw vector search matches to the source-chip shape MessageBubble.jsx
 * expects, and collapses multiple chunks from the same document into one
 * citation — a user doesn't need to see the same email cited 3 times
 * just because it was split into 3 chunks.
 */
function dedupeSources(matches) {
  const seen = new Map();

  for (const match of matches) {
    const key = match.documentId?.toString() || match.sourceRefId;
    if (seen.has(key)) continue;

    seen.set(key, {
      id: match._id.toString(),
      type: match.sourceType,
      label: match.sourceLabel,
      meta: formatSourceMeta(match),
      refId: match.sourceRefId,
      score: match.score,
    });
  }

  return Array.from(seen.values()).slice(0, 4); // cap citations shown per answer
}

function formatSourceMeta(match) {
  const providerNames = { email: "Gmail", calendar: "Calendar", chat: "Chat", doc: "Document" };
  const date = match.createdAt ? new Date(match.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";
  const provider = providerNames[match.sourceType] || match.sourceType;
  return date ? `${provider}, ${date}` : provider;
}

export default { answerQuery };