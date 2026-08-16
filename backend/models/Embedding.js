import mongoose from "mongoose";
import { EMBEDDING_DIMENSIONS } from "../config/vectorSearch.js";

// ----------------------------------------------------------------------
// Memora Backend — Embedding model
// One chunk of text + its vector, used by config/vectorSearch.js's
// $vectorSearch aggregation for RAG retrieval. Field names here match
// exactly what vectorSearchEmbeddings() projects — if you rename a field
// in one place, update the other; there's no schema validation linking
// the aggregation pipeline to this model.
//
// IMPORTANT: this collection is queried via a raw driver aggregation
// (not through this Mongoose model directly) because $vectorSearch
// isn't expressible through the standard Mongoose query API. This
// schema still matters — it's what governs the collection's shape and
// non-vector indexes, and gives you `Embedding.deleteMany(...)` for
// cleanup on disconnect.
// ----------------------------------------------------------------------

const embeddingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true,
      index: true,
    },
    connectedAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ConnectedAccount",
    },

    chunkIndex: {
      type: Number,
      required: true,
    },

    text: {
      type: String,
      required: true,
      maxlength: 4000, // one chunk — see services/embeddings/chunking.js for size policy
    },

    // The actual vector — dimension count must match EMBEDDING_DIMENSIONS
    // in config/vectorSearch.js and the index definition, or Atlas will
    // reject the write.
    embedding: {
      type: [Number],
      required: true,
      validate: {
        validator: (arr) => arr.length === EMBEDDING_DIMENSIONS,
        message: `embedding must have exactly ${EMBEDDING_DIMENSIONS} dimensions`,
      },
    },

    // ---- Denormalized source metadata ----
    // Duplicated from Document.js deliberately so vectorSearchEmbeddings()
    // can return citation info (sourceLabel, sourceType) in a single
    // aggregation without a $lookup join — join-free reads keep RAG
    // query latency low, which matters directly for chat responsiveness.
    sourceType: {
      type: String,
      enum: ["email", "calendar", "chat", "doc"],
      required: true,
    },
    sourceLabel: { type: String, required: true },
    sourceRefId: { type: String, required: true }, // Document.externalId, duplicated for the same reason above
  },
  { timestamps: true }
);

embeddingSchema.index({ documentId: 1, chunkIndex: 1 }, { unique: true });
// NOTE: the actual ANN vector index ("embedding" field) is created
// separately via config/vectorSearch.js's ensureVectorIndex() — Atlas
// Search indexes aren't declared through the standard schema.index() API.

embeddingSchema.set("toJSON", {
  transform(_doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.embedding; // never serialize the raw vector to API responses
    return ret;
  },
});

export default mongoose.model("Embedding", embeddingSchema);