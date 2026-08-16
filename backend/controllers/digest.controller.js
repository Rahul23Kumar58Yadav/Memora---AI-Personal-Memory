import Digest from "../models/Digest.js";
import User from "../models/User.js";
import { generateDigestForUser } from "../services/llm/digestGenerator.js";

// ----------------------------------------------------------------------
// Memora Backend — digest.controller
// Maps to digest.routes.js. Settings live on User.digestSettings (see
// User.js) rather than a separate collection. sendNow shares the exact
// same generation logic the scheduled job uses (services/llm/
// digestGenerator.js) so a manual "send now" and the real 8am digest
// are never subtly different code paths.
// ----------------------------------------------------------------------

// ---- GET /digest ------------------------------------------------------------
export async function list(req, res, next) {
  try {
    const { cursor, limit = 20 } = req.query;
    const filter = { userId: req.userId };
    if (cursor) filter._id = { $lt: cursor };

    const digests = await Digest.find(filter).sort({ _id: -1 }).limit(Number(limit) + 1);
    const hasMore = digests.length > Number(limit);
    const page = hasMore ? digests.slice(0, -1) : digests;

    return res.json({ digests: page, nextCursor: hasMore ? page[page.length - 1].id : null });
  } catch (err) {
    next(err);
  }
}

// ---- GET /digest/latest -------------------------------------------------------
export async function getLatest(req, res, next) {
  try {
    const digest = await Digest.findOne({ userId: req.userId }).sort({ sentAt: -1 });
    if (!digest) {
      return res.status(404).json({ message: "No digest has been sent yet." });
    }
    return res.json({ digest });
  } catch (err) {
    next(err);
  }
}

// ---- GET /digest/:id ------------------------------------------------------------
export async function getById(req, res, next) {
  try {
    const digest = await Digest.findOne({ _id: req.params.id, userId: req.userId });
    if (!digest) {
      return res.status(404).json({ message: "Digest not found." });
    }
    return res.json({ digest });
  } catch (err) {
    next(err);
  }
}

// ---- GET /digest/settings -----------------------------------------------------
export async function getSettings(req, res) {
  return res.json({ settings: req.user.digestSettings });
}

// ---- PATCH /digest/settings ----------------------------------------------------
export async function updateSettings(req, res, next) {
  try {
    const { enabled, time, channel, staleReminders } = req.body;

    const updates = {};
    if (enabled !== undefined) updates["digestSettings.enabled"] = enabled;
    if (time !== undefined) {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
        return res.status(400).json({ message: "Time must be in HH:mm format." });
      }
      updates["digestSettings.time"] = time;
    }
    if (channel !== undefined) {
      if (!["email", "push", "both"].includes(channel)) {
        return res.status(400).json({ message: "Channel must be email, push, or both." });
      }
      updates["digestSettings.channel"] = channel;
    }
    if (staleReminders !== undefined) updates["digestSettings.staleReminders"] = staleReminders;

    const user = await User.findByIdAndUpdate(req.userId, { $set: updates }, { new: true, runValidators: true });
    return res.json({ settings: user.digestSettings });
  } catch (err) {
    next(err);
  }
}

// ---- POST /digest/send-now -------------------------------------------------------
export async function sendNow(req, res, next) {
  try {
    const digest = await generateDigestForUser(req.userId, { isManualSend: true });
    if (!digest) {
      return res.status(200).json({ digest: null, message: "Nothing to report right now — your thread is clear." });
    }
    return res.json({ digest });
  } catch (err) {
    next(err);
  }
}