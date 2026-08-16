import mongoose from "mongoose";

// ----------------------------------------------------------------------
// Memora Backend — Commitment model
// The core entity of the whole product. One document per promise the
// extractor found. `urgency` and `group` are NOT stored — they're
// computed virtuals derived from `dueDate` + `status` at read time, so
// "today" never goes stale in the database as the clock ticks past
// midnight; it's always correct relative to `now`.
// ----------------------------------------------------------------------

const commitmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // The extracted commitment, in Memora's paraphrase — e.g.
    // "Send the revised proposal to Priya". Never the verbatim source
    // text; that lives in `sourceExcerpt` for citation purposes.
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    dueDate: {
      type: Date,
      default: null, // null = "no deadline set" (renders as "Fading" group)
    },

    status: {
      type: String,
      enum: ["active", "kept", "dismissed"],
      default: "active",
      index: true,
    },

    // ---- Provenance (source citation — see CommitmentDetail.jsx) ----
    sourceType: {
      type: String,
      enum: ["email", "calendar", "chat", "doc"],
      required: true,
    },
    sourceLabel: {
      type: String, // e.g. "Re: Q3 partnership terms", "#ops-planning"
      required: true,
    },
    // Verbatim (or near-verbatim) quoted excerpt the extraction came
    // from — shown in CommitmentDetail's "Found in" panel to build trust.
    sourceExcerpt: {
      type: String,
      maxlength: 1000,
    },
    // Points back to the Document this was extracted from, and the
    // ConnectedAccount that produced it — lets "Open original" resolve
    // to a real deep link (Gmail message URL, Slack permalink, etc.)
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
    },
    connectedAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ConnectedAccount",
    },
    sourceUrl: { type: String }, // deep link to the original message/event

    // ---- Extraction quality ----
    // 0–1 confidence from commitmentExtractor.js. Below a threshold
    // (see services/llm/commitmentExtractor.js) items may be held back
    // from surfacing at all rather than risking a false-positive nag.
    confidence: {
      type: Number,
      min: 0,
      max: 1,
    },

    // ---- Lifecycle ----
    keptAt: { type: Date },
    dismissedAt: { type: Date },
    // User's correction reason on dismiss — feeds back into extractor
    // accuracy. See CommitmentDetail's "This wasn't actually a commitment".
    dismissReason: { type: String },

    snoozedUntil: { type: Date }, // if set and in the future, suppress from "active" surfacing

    // Set true once this commitment has appeared in a sent digest, so
    // generateDigest.job.js doesn't re-surface the exact same item
    // verbatim in the very next digest unless it's still relevant.
    includedInDigest: { type: Boolean, default: false },
  },
  { timestamps: true }
);

commitmentSchema.index({ userId: 1, status: 1, dueDate: 1 });
commitmentSchema.index({ userId: 1, createdAt: -1 });
// Text index for the passive-search-within-commitments fallback (the
// RAG path handles free-form chat; this backs CommitmentsPage's ?q=)
commitmentSchema.index({ text: "text", sourceLabel: "text" });

// ---- Derived urgency ----------------------------------------------------
// Mirrors utils/dateFormatter.js's getUrgencyFromDueDate on the frontend
// — kept in sync deliberately; if this logic changes, update both.
commitmentSchema.virtual("urgency").get(function getUrgency() {
  if (this.status === "kept") return "kept";
  if (this.status === "dismissed") return "dismissed";

  if (this.snoozedUntil && this.snoozedUntil.getTime() > Date.now()) return "upcoming";

  if (!this.dueDate) return "stale";

  const now = new Date();
  const due = new Date(this.dueDate);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());

  if (startOfDueDay < startOfToday) return "overdue";
  if (startOfDueDay.getTime() === startOfToday.getTime()) {
    return due.getTime() < now.getTime() ? "overdue" : "today";
  }
  return "upcoming";
});

// ---- Derived group (matches CommitmentList.jsx's section labels) --------
commitmentSchema.virtual("group").get(function getGroup() {
  const urgency = this.urgency;
  if (urgency === "kept") return "Kept";
  if (urgency === "dismissed") return null; // dismissed items shouldn't render at all
  if (urgency === "overdue") return "Overdue";
  if (urgency === "today") return "Today";
  if (urgency === "stale") return "Fading";

  if (!this.dueDate) return "Fading";
  const diffDays = Math.round((this.dueDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  return diffDays <= 7 ? "This week" : "Fading";
});

commitmentSchema.set("toJSON", {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("Commitment", commitmentSchema);