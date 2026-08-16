import mongoose from "mongoose";
import { encrypt, decrypt } from "../utils/encryption.js";

// ----------------------------------------------------------------------
// Memora Backend — ConnectedAccount model
// One document per (user, provider) connection. OAuth tokens are stored
// ENCRYPTED AT REST (see utils/encryption.js) — this is the single most
// security-sensitive collection in the app, since a leak here means
// live access to a user's Gmail/Calendar/Slack, not just Memora data.
// Tokens are `select: false` by default so a plain `.find()` never
// returns them; controllers must explicitly `.select("+accessToken")`.
// ----------------------------------------------------------------------

const connectedAccountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    provider: {
      type: String,
      enum: ["gmail", "outlook", "calendar", "slack", "whatsapp", "notion"],
      required: true,
    },

    // Human-readable identifier shown in ConnectionCard.jsx — email
    // address, workspace name, or phone number depending on provider.
    accountLabel: {
      type: String,
      required: true,
    },

    // Provider's own stable identifier for this account/workspace (e.g.
    // Slack's team_id) — used by webhook.controller.js to look up which
    // ConnectedAccount an inbound event belongs to. accountLabel alone
    // isn't reliable for this since it's a display name, not a stable id.
    providerAccountId: {
      type: String,
      index: true,
    },

    // ---- Encrypted OAuth credentials ----
    // Stored as ciphertext strings (see utils/encryption.js). Use the
    // schema methods below (getAccessToken/setTokens) rather than
    // reading/writing these fields directly.
    accessToken: { type: String, required: true, select: false },
    refreshToken: { type: String, select: false },
    tokenExpiresAt: { type: Date },

    scopes: [{ type: String }],

    status: {
      type: String,
      enum: ["connected", "syncing", "error", "disconnected"],
      default: "connected",
    },

    lastSyncedAt: { type: Date },
    lastSyncError: { type: String },

    // Provider-specific sync cursor (Gmail historyId, Slack cursor, etc.)
    // so incremental syncs don't have to re-scan everything each run.
    syncCursor: { type: String },

    // Scheduled for hard-delete 24h after disconnect, per the privacy
    // note shown in ConnectionsList.jsx. A cron job (jobs/scheduler.js)
    // sweeps records past this timestamp.
    disconnectedAt: { type: Date },
    purgeAfter: { type: Date, index: { expires: 0 } }, // TTL index — Mongo deletes automatically
  },
  { timestamps: true }
);

connectedAccountSchema.index({ userId: 1, provider: 1 }, { unique: true });

// ---- Token encryption helpers -----------------------------------------------
connectedAccountSchema.methods.setTokens = function setTokens({ accessToken, refreshToken, expiresAt }) {
  this.accessToken = encrypt(accessToken);
  if (refreshToken) this.refreshToken = encrypt(refreshToken);
  if (expiresAt) this.tokenExpiresAt = expiresAt;
};

connectedAccountSchema.methods.getAccessToken = function getAccessToken() {
  if (!this.accessToken) return null;
  return decrypt(this.accessToken);
};

connectedAccountSchema.methods.getRefreshToken = function getRefreshToken() {
  if (!this.refreshToken) return null;
  return decrypt(this.refreshToken);
};

connectedAccountSchema.methods.isTokenExpired = function isTokenExpired() {
  if (!this.tokenExpiresAt) return false;
  return this.tokenExpiresAt.getTime() < Date.now();
};

/** Marks this connection for deletion 24h from now, per the stated privacy policy. */
connectedAccountSchema.methods.scheduleDisconnect = function scheduleDisconnect() {
  this.status = "disconnected";
  this.disconnectedAt = new Date();
  this.purgeAfter = new Date(Date.now() + 24 * 60 * 60 * 1000);
};

// ---- Safe serialization: never leak tokens even if select("+accessToken") was used
connectedAccountSchema.set("toJSON", {
  transform(_doc, ret) {
    delete ret.accessToken;
    delete ret.refreshToken;
    delete ret.syncCursor;
    delete ret.__v;
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});

export default mongoose.model("ConnectedAccount", connectedAccountSchema);