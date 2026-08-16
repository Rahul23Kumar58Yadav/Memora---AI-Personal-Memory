import mongoose from "mongoose";

// ----------------------------------------------------------------------
// Memora Backend — ChatSession model
// Message history for passive-recall conversations (ChatWindow.jsx /
// useChat.js). Sources are stored per-message so a past conversation
// remains fully re-citable later, without re-running retrieval.
// ----------------------------------------------------------------------

const sourceSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["email", "calendar", "chat", "doc"],
      required: true,
    },
    label: { type: String, required: true },
    meta: { type: String }, // e.g. "Gmail", "WhatsApp, Aug 2"
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: "Document" },
    // Similarity score from the vector search that surfaced this source,
    // kept for debugging/tuning retrieval quality — not shown in the UI.
    score: { type: Number },
  },
  { _id: true }
);

const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    text: {
      type: String,
      required: true,
      maxlength: 4000,
    },
    sources: [sourceSchema],
  },
  { timestamps: true, _id: true }
);

const chatSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Auto-derived short title for a session list (e.g. first ~40 chars
    // of the first user message) — set once, not recomputed per message.
    title: {
      type: String,
      maxlength: 120,
    },

    messages: [messageSchema],

    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

chatSessionSchema.index({ userId: 1, lastMessageAt: -1 });

chatSessionSchema.methods.appendMessage = function appendMessage({ role, text, sources = [] }) {
  this.messages.push({ role, text, sources });
  this.lastMessageAt = new Date();
  if (!this.title && role === "user") {
    this.title = text.length > 60 ? `${text.slice(0, 57)}...` : text;
  }
};

chatSessionSchema.set("toJSON", {
  transform(_doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("ChatSession", chatSessionSchema);