import { env } from "../../config/env.js";
import { logger } from "../../utils/logger.js";

// ----------------------------------------------------------------------
// Memora Backend — embeddingService.js
// Thin wrapper around the embedding provider (Voyage by default — good
// retrieval quality and cheap at this scale; OpenAI as an alternative).
// Both ragQuery.js (embedding the user's question) and the ingestion
// pipeline (embedding document chunks) call through here, so swapping
// providers or models later is a one-file change.
// ----------------------------------------------------------------------

const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings";
const OPENAI_API_URL = "https://api.openai.com/v1/embeddings";

/**
 * Embeds a batch of text strings. Batching (not one-at-a-time) matters
 * once a document produces dozens of chunks — this cuts the number of
 * API round trips proportionally.
 *
 * @param {string[]} texts
 * @param {{ inputType?: "query" | "document" }} [options] - Voyage
 *   distinguishes query vs. document embeddings for better retrieval;
 *   pass "query" when embedding a user's chat question, "document" when
 *   embedding ingested content.
 * @returns {Promise<number[][]>} one embedding vector per input text, same order
 */
export async function embedBatch(texts, { inputType = "document" } = {}) {
  if (!texts.length) return [];

  if (env.EMBEDDING_PROVIDER === "voyage") {
    return embedWithVoyage(texts, inputType);
  }
  return embedWithOpenAI(texts);
}

/** Convenience wrapper for embedding a single string (e.g. a chat query). */
export async function embedOne(text, options) {
  const [vector] = await embedBatch([text], options);
  return vector;
}

async function embedWithVoyage(texts, inputType) {
  const response = await fetch(VOYAGE_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.EMBEDDING_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.EMBEDDING_MODEL,
      input: texts,
      input_type: inputType, // "query" | "document"
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    logger.error("Voyage embedding request failed", { status: response.status, body });
    throw new Error(`Embedding request failed (${response.status})`);
  }

  const data = await response.json();
  // Voyage returns results in the same order as input, but sort by
  // index defensively rather than assuming.
  return data.data.sort((a, b) => a.index - b.index).map((item) => item.embedding);
}

async function embedWithOpenAI(texts) {
  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.EMBEDDING_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.EMBEDDING_MODEL,
      input: texts,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    logger.error("OpenAI embedding request failed", { status: response.status, body });
    throw new Error(`Embedding request failed (${response.status})`);
  }

  const data = await response.json();
  return data.data.sort((a, b) => a.index - b.index).map((item) => item.embedding);
}

export default { embedBatch, embedOne };