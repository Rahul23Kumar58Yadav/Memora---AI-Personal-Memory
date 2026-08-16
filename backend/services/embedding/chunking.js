// ----------------------------------------------------------------------
// Memora Backend -- chunking.js
// Splits a Document's full text into overlapping chunks small enough to
// embed well and cite precisely. Two things matter more here than raw
// size: (1) never cut mid-sentence -- a chunk ending mid-thought both
// embeds worse and makes a bad citation excerpt, and (2) overlap between
// consecutive chunks so a commitment sentence split near a chunk
// boundary still appears whole in at least one chunk.
// ----------------------------------------------------------------------

const TARGET_CHUNK_CHARS = 1200; // roughly 250-300 tokens -- good balance of retrieval precision vs. context per chunk
const OVERLAP_CHARS = 150; // shared tail/head between consecutive chunks
const MAX_CHUNK_CHARS = 4000; // hard ceiling -- matches Embedding.js's text maxlength

/**
 * Splits raw text into chunks along sentence boundaries where possible.
 *
 * @param {string} text
 * @returns {string[]} ordered chunk texts
 */
export function chunkText(text) {
  const cleaned = normalizeWhitespace(text);
  if (!cleaned) return [];
  if (cleaned.length <= TARGET_CHUNK_CHARS) return [cleaned];

  const sentences = splitIntoSentences(cleaned);
  const chunks = [];
  let current = "";

  for (const sentence of sentences) {
    // A single sentence longer than the hard ceiling (rare -- a giant
    // run-on paragraph with no punctuation) gets hard-split rather than
    // dropped, so nothing silently disappears from the index.
    if (sentence.length > MAX_CHUNK_CHARS) {
      if (current) {
        chunks.push(current.trim());
        current = "";
      }
      chunks.push(...hardSplit(sentence));
      continue;
    }

    if (current.length + sentence.length > TARGET_CHUNK_CHARS && current.length > 0) {
      chunks.push(current.trim());
      // Start the next chunk with a tail-overlap of the previous chunk's
      // end, so context isn't lost right at the seam.
      current = tailOverlap(current) + sentence;
    } else {
      current += (current ? " " : "") + sentence;
    }
  }

  if (current.trim()) chunks.push(current.trim());

  return chunks.filter((c) => c.length > 0);
}

/**
 * Convenience wrapper: chunks a Document's full text and returns objects
 * ready to embed, tagged with their index for Embedding.js's
 * (documentId, chunkIndex) uniqueness constraint.
 */
export function chunkDocument(fullText) {
  return chunkText(fullText).map((text, chunkIndex) => ({ chunkIndex, text }));
}

function normalizeWhitespace(text) {
  return (text || "").replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Naive but effective sentence splitter -- splits on '.', '!', '?'
 * followed by whitespace and a capital letter or newline, while
 * avoiding common false positives like "Mr." or "e.g.". Good enough for
 * email/chat/doc text; not meant to be a full NLP sentence tokenizer.
 */
function splitIntoSentences(text) {
  const ABBREVIATIONS = /\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|vs|etc|e\.g|i\.e)\.$/i;

  const rough = text.split(/(?<=[.!?])\s+(?=[A-Z0-9"'\n])/);
  const sentences = [];
  let buffer = "";

  for (const piece of rough) {
    buffer = buffer ? `${buffer} ${piece}` : piece;
    if (!ABBREVIATIONS.test(buffer.trim())) {
      sentences.push(buffer.trim());
      buffer = "";
    }
  }
  if (buffer.trim()) sentences.push(buffer.trim());

  return sentences.filter(Boolean);
}

function tailOverlap(text) {
  if (text.length <= OVERLAP_CHARS) return `${text} `;
  return `${text.slice(-OVERLAP_CHARS)} `;
}

/** Hard character-based split for a single sentence that exceeds MAX_CHUNK_CHARS on its own. */
function hardSplit(text) {
  const parts = [];
  for (let i = 0; i < text.length; i += TARGET_CHUNK_CHARS) {
    parts.push(text.slice(i, i + TARGET_CHUNK_CHARS));
  }
  return parts;
}

export default { chunkText, chunkDocument };