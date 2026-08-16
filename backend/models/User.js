import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// ----------------------------------------------------------------------
// Memora Backend — User model
// Supports both email/password and Google OAuth signup — passwordHash
// is optional specifically so a Google-only account isn't forced to
// have a password. Never return passwordHash in API responses; it's
// excluded by default (select: false) so a stray `User.find()` can't
// leak it accidentally.
// ----------------------------------------------------------------------

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      select: false, // never returned unless explicitly requested
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true, // allows many docs with no googleId
    },
    avatarUrl: {
      type: String,
    },

    // ---- Digest preferences (see DigestSettings.jsx shape) ----
    digestSettings: {
      enabled: { type: Boolean, default: true },
      time: { type: String, default: "08:00" }, // "HH:mm", interpreted in `timezone`
      channel: {
        type: String,
        enum: ["email", "push", "both"],
        default: "push",
      },
      staleReminders: { type: Boolean, default: true },
    },

    timezone: {
      type: String,
      default: "UTC",
    },

    // Push notification device tokens (FCM), for jobs/generateDigest.job.js
    pushTokens: [{ type: String }],

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    // Password reset flow
    passwordResetToken: { type: String, select: false },
    passwordResetExpiresAt: { type: Date, select: false },

    lastLoginAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// ---- Password hashing ------------------------------------------------------
// Declared as a plain async function with NO `next` parameter — modern
// Mongoose detects an async pre-hook by its return type (a Promise) and
// waits on that directly, rather than injecting a next() callback. Mixing
// `async function(next)` with a manual next() call (the old Mongoose 4/5
// pattern) throws "next is not a function", since next is never passed
// to an async-declared hook.
userSchema.pre("save", async function hashPassword() {
  if (!this.isModified("passwordHash") || !this.passwordHash) return;
  // Guard against double-hashing if passwordHash is set to an already-hashed value
  if (this.passwordHash.startsWith("$2")) return;
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  if (!this.passwordHash) return Promise.resolve(false);
  return bcrypt.compare(candidate, this.passwordHash);
};

// ---- Safe serialization -----------------------------------------------------
// Strips sensitive fields even if a query accidentally included them via
// .select("+passwordHash"). Controllers should still prefer toPublicJSON().
userSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    avatarUrl: this.avatarUrl,
    digestSettings: this.digestSettings,
    timezone: this.timezone,
    isEmailVerified: this.isEmailVerified,
    createdAt: this.createdAt,
  };
};

userSchema.set("toJSON", {
  transform(_doc, ret) {
    delete ret.passwordHash;
    delete ret.passwordResetToken;
    delete ret.passwordResetExpiresAt;
    delete ret.__v;
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});

export default mongoose.model("User", userSchema);