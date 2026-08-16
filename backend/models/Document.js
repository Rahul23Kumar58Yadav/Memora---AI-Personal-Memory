import mongoose from "mongoose";

// ----------------------------------------------------------------------
// Memora Backend — Document model
// Metadata for every raw item ingested from a connected source (an
// email, a calendar event, a chat message, a file). Deliberately does
// NOT store the full raw text long-term — see `rawTextExpiresAt` below.
// The chunked, embedded version lives in Embedding.js for RAG; this
// model exists so Commitment.documentId and "Open original" links have
// somewhere stable to point to.
// ----------------------------------------------------------------------

const documentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    connectedAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ConnectedAccount",
      required: true,
      index: true,
    },

    sourceType: {
      type: String,
      enum: ["email", "calendar", "chat", "doc"],
      required: true,
    },

    // Provider's own identifier for this item (Gmail message id, Slack
    // ts, Google Calendar event id, Notion page id) — used to detect
    // duplicates on re-sync and to build deep links.
    externalId: {
      type: String,
      required: true,
    },

    title: {
      type: String, // email subject, event title, doc name, channel name
      trim: true,
      maxlength: 300,
    },

    // Short preview only — NOT the full body. Full text is processed
    // into chunks (see services/embeddings/chunking.js) and stored in
    // Embedding.js, then this field's raw text is discarded. Keeping a
    // full permanent copy of someone's email body in a second place
    // widens the blast radius of a data breach for no real benefit.
    previewText: {
      type: String,
      maxlength: 500,
    },

    url: { type: String }, // deep link back to the source (Gmail thread, Slack permalink, etc.)

    occurredAt: {
      type: Date, // when the email was sent / event starts / message posted
      required: true,
    },

    // ---- Processing pipeline state ----
    status: {
      type: String,
      enum: ["pending", "chunked", "embedded", "extracted", "failed"],
      default: "pending",
      index: true,
    },
    processingError: { type: String },
    chunkCount: { type: Number, default: 0 },

    // Raw text is only ever held transiently for pipeline processing —
    // this timestamp is set on ingest and a scheduled job purges any
    // lingering `previewText` beyond it if processing stalls out.
    rawTextExpiresAt: { type: Date },
  },
  { timestamps: true }
);

// A given external item should only ever be ingested once per account.
documentSchema.index({ connectedAccountId: 1, externalId: 1 }, { unique: true });
documentSchema.index({ userId: 1, occurredAt: -1 });

documentSchema.set("toJSON", {
  transform(_doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("Document", documentSchema);