import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

// ----------------------------------------------------------------------
// Memora Backend — vectorSearch.js
// Wraps MongoDB Atlas Vector Search: the $vectorSearch aggregation stage
// used by services/vectorSearch.service.js (RAG retrieval) and the
// index-definition helper used once at setup time.
//
// IMPORTANT: Atlas Vector Search indexes are NOT created through the
// normal Mongoose/driver index API — they're a separate Atlas Search
// index type. `ensureVectorIndex()` below creates it via the driver's
// createSearchIndex() (works on Atlas clusters M10+, or local Atlas CLI
// deployments). On some Atlas tiers you may need to create it once via
// the Atlas UI instead — this function is safe to call either way since
// it no-ops if the index already exists.
// ----------------------------------------------------------------------

export const VECTOR_INDEX_NAME = env.MONGODB_VECTOR_INDEX;
export const EMBEDDING_DIMENSIONS = 1024; // voyage-3 default; change if EMBEDDING_MODEL differs

const VECTOR_INDEX_DEFINITION = {
  name: VECTOR_INDEX_NAME,
  type: "vectorSearch",
  definition: {
    fields: [
      {
        type: "vector",
        path: "embedding",
        numDimensions: EMBEDDING_DIMENSIONS,
        similarity: "cosine",
      },
      // Filter fields — lets $vectorSearch pre-filter by owner before
      // the similarity search runs, which is what actually enforces
      // per-user data isolation. Never skip the userId filter at the
      // query layer and rely on this index alone.
      { type: "filter", path: "userId" },
      { type: "filter", path: "sourceType" },
    ],
  },
};

/**
 * Creates the Atlas Vector Search index on the `embeddings` collection
 * if it doesn't already exist. Call once from a setup script, not on
 * every server boot.
 */
export async function ensureVectorIndex() {
  const collection = mongoose.connection.collection("embeddings");

  const existing = await collection.listSearchIndexes().toArray().catch(() => []);
  const alreadyExists = existing.some((idx) => idx.name === VECTOR_INDEX_NAME);

  if (alreadyExists) {
    logger.info(`Vector index "${VECTOR_INDEX_NAME}" already exists`);
    return;
  }

  await collection.createSearchIndex(VECTOR_INDEX_DEFINITION);
  logger.info(`Vector index "${VECTOR_INDEX_NAME}" created — may take a few minutes to build`);
}

/**
 * Runs a $vectorSearch aggregation against the `embeddings` collection,
 * scoped to a single user, and returns the top-K matching chunks with
 * their source metadata for RAG retrieval + citation.
 *
 * @param {number[]} queryEmbedding - embedding vector for the user's query
 * @param {string} userId
 * @param {object} options
 * @param {number} [options.limit=8] - number of chunks to return
 * @param {number} [options.candidates=100] - ANN candidates to consider (numCandidates)
 * @param {string[]} [options.sourceTypes] - optional filter, e.g. ["email", "chat"]
 */
export async function vectorSearchEmbeddings(queryEmbedding, userId, options = {}) {
  const { limit = 8, candidates = 100, sourceTypes } = options;

  const filter = { userId: new mongoose.Types.ObjectId(userId) };
  if (sourceTypes?.length) filter.sourceType = { $in: sourceTypes };

  const pipeline = [
    {
      $vectorSearch: {
        index: VECTOR_INDEX_NAME,
        path: "embedding",
        queryVector: queryEmbedding,
        numCandidates: candidates,
        limit,
        filter,
      },
    },
    {
      $project: {
        _id: 1,
        documentId: 1,
        text: 1,
        sourceType: 1,
        sourceLabel: 1,
        sourceRefId: 1,
        createdAt: 1,
        score: { $meta: "vectorSearchScore" },
      },
    },
  ];

  const collection = mongoose.connection.collection("embeddings");
  return collection.aggregate(pipeline).toArray();
}

export default { ensureVectorIndex, vectorSearchEmbeddings, VECTOR_INDEX_NAME };