import cron from "node-cron";
import { syncQueue, syncWorker, enqueueSync } from "./syncInbox.job.js";
import { extractionQueue, extractionWorker } from "./extractCommitments.job.js";
import { registerDigestSweep } from "./generateDigest.job.js";
import ConnectedAccount from "../models/ConnectedAccount.js";
import { logger } from "../utils/logger.js";

// ----------------------------------------------------------------------
// Memora Backend -- jobs/scheduler.js
// Single entry point that wires up every background process: starts the
// BullMQ workers (by importing them — see the module-load side effect
// note below), registers the digest cron sweep, and registers a
// periodic "resync every connected account" sweep so data stays fresh
// even without the user manually hitting "sync now".
//
// Call initializeJobs() ONCE from server.js, after connectDB() succeeds
// — workers must not start consuming jobs before Mongo is connected, or
// the first job to run will crash on its first query.
// ----------------------------------------------------------------------

const PERIODIC_RESYNC_CRON = "0 * * * *"; // every hour, on the hour

/**
 * Sweeps every non-disconnected ConnectedAccount and enqueues an
 * incremental sync. Cheap for the account itself (syncInbox.job.js
 * uses the stored cursor/lastSyncedAt, so this is a small delta fetch,
 * not a full re-pull) — this is the safety net for connections whose
 * webhook (webhook.routes.js) was missed or isn't configured for that
 * provider yet.
 */
async function runPeriodicResync() {
  const accounts = await ConnectedAccount.find({ status: { $ne: "disconnected" } }).select("_id userId");

  let enqueued = 0;
  for (const account of accounts) {
    try {
      await enqueueSync({ connectedAccountId: account._id.toString(), userId: account.userId.toString(), isInitial: false });
      enqueued++;
    } catch (err) {
      logger.error("Periodic resync: failed to enqueue", { connectedAccountId: account._id.toString(), error: err.message });
    }
  }

  logger.info("Periodic resync sweep completed", { accountsSwept: accounts.length, enqueued });
}

function registerPeriodicResync() {
  cron.schedule(PERIODIC_RESYNC_CRON, () => {
    runPeriodicResync().catch((err) => logger.error("Periodic resync sweep crashed", { error: err.message }));
  });
  logger.info(`Periodic resync scheduled (${PERIODIC_RESYNC_CRON})`);
}

/**
 * Starts every background job. syncWorker/extractionWorker begin
 * consuming their queues as a side effect of being imported at the top
 * of this file — importing this module IS what starts them; the
 * explicit references below just keep them from being tree-shaken and
 * make that dependency visible to anyone reading this file.
 */
export function initializeJobs() {
  void syncWorker;
  void extractionWorker;

  registerDigestSweep();
  registerPeriodicResync();

  logger.info("All background jobs initialized (sync worker, extraction worker, digest sweep, periodic resync)");
}

/** Graceful shutdown — called from server.js on SIGTERM/SIGINT. */
export async function shutdownJobs() {
  await Promise.all([
    syncWorker.close(),
    extractionWorker.close(),
    syncQueue.close(),
    extractionQueue.close(),
  ]);
  logger.info("Background jobs shut down cleanly");
}

export default { initializeJobs, shutdownJobs };