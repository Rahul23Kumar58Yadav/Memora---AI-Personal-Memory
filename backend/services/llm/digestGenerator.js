import Commitment from "../../models/Commitment.js";
import Digest from "../../models/Digest.js";
import User from "../../models/User.js";
import { sendDigestNotification } from "../notification.service.js";
import { logger } from "../../utils/logger.js";

// ----------------------------------------------------------------------
// Memora Backend -- digestGenerator.js
// Builds the "you promised X by Friday" digest. Called by BOTH the
// scheduled job (jobs/generateDigest.job.js, at each user's configured
// digestSettings.time) and digest.controller.js's sendNow -- same
// function, so a manual send during onboarding behaves identically to
// the real 8am digest, not a lookalike code path that can drift.
//
// A digest is a SNAPSHOT (see Digest.js) -- item text/due/urgency are
// copied in at generation time, not live references, so a digest from
// three weeks ago still reads exactly as it did when it arrived.
// ----------------------------------------------------------------------

const STALE_ITEM_LIMIT = 3; // cap how many no-deadline "fading" items appear per digest
const STALE_RENUDGE_DAYS = 7; // don't re-surface the same stale item more than once a week

/**
 * Generates and sends a digest for one user, if there's anything worth
 * sending. Returns the created Digest doc, or null if nothing qualified
 * (an empty digest is deliberately never sent -- see generateDigestForUser).
 */
export async function generateDigestForUser(userId, { isManualSend = false } = {}) {
  const user = await User.findById(userId);
  if (!user) {
    logger.warn("generateDigestForUser: user not found", { userId });
    return null;
  }

  const [overdueItems, todayItems, staleItems, keptCount] = await Promise.all([
    fetchOverdue(userId),
    fetchDueToday(userId),
    user.digestSettings.staleReminders ? fetchStale(userId) : Promise.resolve([]),
    countKeptSinceLastDigest(userId),
  ]);

  const surfacedItems = [...overdueItems, ...todayItems, ...staleItems];

  // Nothing overdue, nothing due today, nothing worth nudging on, and
  // nothing kept to celebrate -- genuinely nothing to say. Silence is
  // the right call here, not a "you have 0 commitments!" email.
  if (surfacedItems.length === 0 && keptCount === 0) {
    return null;
  }

  const items = surfacedItems.map(toDigestItemSnapshot);

  const digest = await Digest.create({
    userId,
    channel: user.digestSettings.channel,
    stats: {
      overdue: overdueItems.length,
      dueToday: todayItems.length,
      kept: keptCount,
    },
    items,
    sentAt: new Date(),
    isManualSend,
  });

  // Mark surfaced commitments so the same stale item isn't re-nudged
  // again tomorrow -- see fetchStale's cooldown query.
  if (surfacedItems.length > 0) {
    await Commitment.updateMany(
      { _id: { $in: surfacedItems.map((i) => i._id) } },
      { includedInDigest: true }
    );
  }

  try {
    await sendDigestNotification(user, digest);
  } catch (err) {
    // The digest record exists either way -- a delivery failure shouldn't
    // erase the fact that it was generated, just get logged for retry.
    logger.error("Digest generated but delivery failed", { userId, digestId: digest.id, error: err.message });
  }

  return digest;
}

// ---- Query helpers ---------------------------------------------------------

function fetchOverdue(userId) {
  return Commitment.find({
    userId,
    status: "active",
    dueDate: { $lt: new Date(), $ne: null },
  }).sort({ dueDate: 1 });
}

function fetchDueToday(userId) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

  return Commitment.find({
    userId,
    status: "active",
    dueDate: { $gte: startOfToday, $lt: startOfTomorrow },
  }).sort({ dueDate: 1 });
}

/** No-deadline commitments, excluding ones nudged within the cooldown window. */
function fetchStale(userId) {
  const cooldownCutoff = new Date(Date.now() - STALE_RENUDGE_DAYS * 24 * 60 * 60 * 1000);

  return Commitment.find({
    userId,
    status: "active",
    dueDate: null,
    $or: [{ includedInDigest: false }, { updatedAt: { $lt: cooldownCutoff } }],
  })
    .sort({ createdAt: 1 }) // oldest-forgotten first
    .limit(STALE_ITEM_LIMIT);
}

function countKeptSinceLastDigest(userId) {
  return Digest.findOne({ userId })
    .sort({ sentAt: -1 })
    .then((lastDigest) => {
      const since = lastDigest?.sentAt || new Date(Date.now() - 24 * 60 * 60 * 1000);
      return Commitment.countDocuments({ userId, status: "kept", keptAt: { $gte: since } });
    });
}

// ---- Formatting --------------------------------------------------------------

function toDigestItemSnapshot(commitment) {
  return {
    commitmentId: commitment._id,
    text: commitment.text,
    due: formatDueForDigest(commitment.dueDate),
    urgency: commitment.urgency, // virtual, resolved at generation time
  };
}

/** Server-side mirror of the frontend's formatDueDate -- kept intentionally simple since digest copy doesn't need the full nuance of the live UI. */
function formatDueForDigest(dueDate) {
  if (!dueDate) return "No deadline set";

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDue = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  const diffDays = Math.round((startOfDue - startOfToday) / (24 * 60 * 60 * 1000));

  const time = dueDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  if (diffDays === 0) return `Today, ${time}`;
  if (diffDays === -1) return "Yesterday";
  if (diffDays < -1) return `${Math.abs(diffDays)} days overdue`;
  if (diffDays === 1) return "Tomorrow";
  return dueDate.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default { generateDigestForUser };