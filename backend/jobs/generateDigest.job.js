import cron from "node-cron";
import User from "../models/User.js";
import { generateDigestForUser } from "../services/llm/digestGenerator.js";
import { logger } from "../utils/logger.js";

// ----------------------------------------------------------------------
// Memora Backend -- generateDigest.job.js
// Unlike syncInbox/extractCommitments, this isn't a BullMQ queue -- there's
// no external event to react to, just "is it this user's configured
// digest time yet." Runs on a node-cron sweep every 15 minutes and
// checks each enabled user's LOCAL time (via their stored IANA
// timezone) against their digestSettings.time, in 15-minute buckets to
// match the sweep interval.
//
// This intentionally does NOT use one cron job per user -- with
// thousands of users that's thousands of scheduled tasks to manage.
// One sweep, filtered per user, scales far better and is much simpler
// to reason about.
// ----------------------------------------------------------------------

const SWEEP_CRON = "*/15 * * * *"; // every 15 minutes

/** Returns "HH:mm" for `date` as observed in the given IANA timezone. */
function localTimeInZone(date, timezone) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(date);
  } catch {
    // Invalid/unknown timezone string — fall back to UTC rather than crash the sweep
    return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);
  }
}

/** Buckets a "HH:mm" string down to the nearest 15-minute mark, matching the sweep cadence. */
function roundToBucket(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const bucketed = Math.floor(m / 15) * 15;
  return `${String(h).padStart(2, "0")}:${String(bucketed).padStart(2, "0")}`;
}

async function runDigestSweep() {
  const now = new Date();
  const users = await User.find({ "digestSettings.enabled": true }).select("timezone digestSettings");

  let sent = 0;

  for (const user of users) {
    const currentBucket = roundToBucket(localTimeInZone(now, user.timezone));
    const configuredBucket = roundToBucket(user.digestSettings.time);

    if (currentBucket !== configuredBucket) continue;

    try {
      const digest = await generateDigestForUser(user._id.toString(), { isManualSend: false });
      if (digest) sent++;
    } catch (err) {
      // One user's failure must never block the rest of the sweep.
      logger.error("generateDigest sweep: failed for user", { userId: user._id.toString(), error: err.message });
    }
  }

  if (sent > 0) {
    logger.info("generateDigest sweep completed", { usersChecked: users.length, digestsSent: sent });
  }
}

/** Registered by jobs/scheduler.js at server boot. */
export function registerDigestSweep() {
  cron.schedule(SWEEP_CRON, () => {
    runDigestSweep().catch((err) => logger.error("generateDigest sweep crashed", { error: err.message }));
  });
  logger.info(`Digest sweep scheduled (${SWEEP_CRON})`);
}

// Exported for jobs/scheduler.js's manual-trigger / testing convenience.
export { runDigestSweep };

export default { registerDigestSweep, runDigestSweep };