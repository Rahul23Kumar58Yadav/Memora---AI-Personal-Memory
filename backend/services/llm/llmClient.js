import Anthropic from "@anthropic-ai/sdk";
import { env } from "../../config/env.js";
import { logger } from "../../utils/logger.js";

// ----------------------------------------------------------------------
// Memora Backend — llmClient.js
// Single wrapper around the Anthropic API. Every other service
// (commitmentExtractor, ragQuery, digestGenerator) calls through this
// file rather than instantiating its own client — one place to change
// models, add retry/timeout behavior, or swap providers later.
// ----------------------------------------------------------------------

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 500;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(err) {
  // Retry on rate limits and transient server errors, not on our own
  // bad requests (400s) — retrying a malformed prompt just wastes time.
  const status = err?.status;
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 529;
}

async function withRetry(fn, { label }) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!isRetryable(err) || attempt === MAX_RETRIES) throw err;
      const delay = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
      logger.warn(`${label} failed (attempt ${attempt}/${MAX_RETRIES}), retrying in ${delay}ms`, {
        status: err.status,
        message: err.message,
      });
      await sleep(delay);
    }
  }
  throw lastError;
}

/**
 * Plain text completion. Use for open-ended generation (digest copy,
 * conversational chat replies) where no strict output schema is needed.
 */
export async function complete({ system, messages, maxTokens = 1024, temperature = 0.3 }) {
  return withRetry(
    async () => {
      const response = await client.messages.create({
        model: env.LLM_MODEL,
        max_tokens: maxTokens,
        temperature,
        system,
        messages,
      });
      return extractText(response);
    },
    { label: "llmClient.complete" }
  );
}

/**
 * JSON-mode completion. Instructs the model to return ONLY valid JSON
 * matching the caller's described shape, parses it, and retries once
 * with a corrective follow-up message if parsing fails — this is what
 * commitmentExtractor.js relies on for structured output.
 */
export async function completeJSON({ system, messages, maxTokens = 1024, temperature = 0.1 }) {
  const jsonSystem = `${system}\n\nRespond with ONLY valid JSON. No prose, no markdown code fences, no explanation before or after — the entire response must be parseable by JSON.parse().`;

  const rawText = await withRetry(
    async () => {
      const response = await client.messages.create({
        model: env.LLM_MODEL,
        max_tokens: maxTokens,
        temperature,
        system: jsonSystem,
        messages,
      });
      return extractText(response);
    },
    { label: "llmClient.completeJSON" }
  );

  try {
    return parseJSONLoosely(rawText);
  } catch (firstError) {
    logger.warn("LLM returned unparseable JSON, retrying with correction", { error: firstError.message });

    // One corrective retry: show the model its own bad output and ask
    // it to fix it, rather than silently failing the whole extraction.
    const correctionText = await withRetry(
      async () => {
        const response = await client.messages.create({
          model: env.LLM_MODEL,
          max_tokens: maxTokens,
          temperature: 0,
          system: jsonSystem,
          messages: [
            ...messages,
            { role: "assistant", content: rawText },
            {
              role: "user",
              content: "That was not valid JSON. Return ONLY the corrected valid JSON, nothing else.",
            },
          ],
        });
        return extractText(response);
      },
      { label: "llmClient.completeJSON.correction" }
    );

    return parseJSONLoosely(correctionText);
  }
}

function extractText(response) {
  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock?.text ?? "";
}

/** Strips markdown code fences if the model added them despite instructions, then parses. */
function parseJSONLoosely(text) {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\n?/i, "")
    .replace(/\n?```$/, "");
  return JSON.parse(cleaned);
}

export default { complete, completeJSON };