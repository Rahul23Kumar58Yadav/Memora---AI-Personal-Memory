import mongoose from "mongoose";
import Embedding from "../models/Embedding.js";
import { chunkDocument } from "./embeddings/chunking.js";
import { embedBatch } from "./embeddings/embeddingService.js";
import { vectorSearchEmbeddings as runVectorSearch } from "../config/vectorSearch.js";
import { logger } from "../utils/logger.js";

// ----------------------------------------------------------------------
// Memora Backend -- vectorSearch.service.js
// The write-side counterpart to config/vectorSearch.js's read-side
// $vectorSearch query. This is what jobs/syncInbox.job.js calls after a
// connector fetches a Document: chunk -> embed -> store. Kept separate
// from config/vectorSearch.js (which only holds the raw index
// definition + query aggregation) so the actual ingestion LOGIC -- ie
// what "process a document" means -- lives with the other services,
// not buried in config/.
// ----------------------------------------------------------------------

const EMBED_BATCH_SIZE = 20; // chunks embedded per API call -- keeps individual requests reasonably sized

/**
 * Chunks a document's full text, embeds every chunk, and persists them
 * as Embedding docs. Returns the number of chunks stored.
 *
 * @param {object} document - a Document mongoose doc (or plain object with the same shape)
 * @param {string} fullText - the raw text to index (from the connector's NormalizedItem.fullText)
 * @param {string} userId
 */
export async function embedAndStoreDocument(document, fullText, userId) {
  const chunks = chunkDocument(fullText);
  if (chunks.length === 0) {
    logger.debug("vectorSearch.service: nothing to embed", { documentId: document._id?.toString() });
    return 0;
  }

  let storedCount = 0;

  for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
    const batch = chunks.slice(i, i + EMBED_BATCH_SIZE);
    const vectors = await embedBatch(
      batch.map((c) => c.text),
      { inputType: "document" }
    );

    const docs = batch.map((chunk, idx) => ({
      userId,
      documentId: document._id,
      connectedAccountId: document.connectedAccountId,
      chunkIndex: chunk.chunkIndex,
      text: chunk.text,
      embedding: vectors[idx],
      sourceType: document.sourceType,
      sourceLabel: document.title,
      sourceRefId: document.externalId,
    }));

    // Upsert on (documentId, chunkIndex) so re-processing the same
    // document on a re-sync updates existing chunks instead of
    // duplicating them.
    await Embedding.bulkWrite(
      docs.map((doc) => ({
        updateOne: {
          filter: { documentId: doc.documentId, chunkIndex: doc.chunkIndex },
          update: { $set: doc },
          upsert: true,
        },
      }))
    );

    storedCount += docs.length;
  }

  logger.debug("vectorSearch.service: document embedded", {
    documentId: document._id?.toString(),
    chunkCount: storedCount,
  });

  return storedCount;
}

/**
 * Removes every embedding tied to a document -- called when a document
 * is deleted or fails processing and needs a clean re-attempt.
 */
export async function deleteEmbeddingsForDocument(documentId) {
  await Embedding.deleteMany({ documentId });
}

/**
 * Removes every embedding tied to a connected account -- called on
 * disconnect, alongside ConnectedAccount's scheduleDisconnect(), so a
 * revoked Gmail connection doesn't leave its content searchable in RAG
 * after the user explicitly disconnected it.
 */
export async function deleteEmbeddingsForAccount(connectedAccountId) {
  const result = await Embedding.deleteMany({ connectedAccountId });
  logger.info("Embeddings purged for disconnected account", {
    connectedAccountId,
    deletedCount: result.deletedCount,
  });
  return result.deletedCount;
}

/**
 * Thin re-export of config/vectorSearch.js's read query, so callers
 * (ragQuery.js) have the option to import search from the services
 * layer instead of config/ directly, keeping "config" limited to setup
 * (index definitions) and "services" to actual operations.
 */
export async function search(queryEmbedding, userId, options) {
  return runVectorSearch(queryEmbedding, userId, options);
}

export default { embedAndStoreDocument, deleteEmbeddingsForDocument, deleteEmbeddingsForAccount, search };