import { Queue, Worker } from "bullmq";
import { bullConnection } from "../config/redis.js";
import ConnectedAccount from "../models/ConnectedAccount.js";
import Document from "../models/Document.js";
import { getConnector } from "../services/connectors/index.js";
import { embedAndStoreDocument } from "../services/vectorSearch.service.js";
import { enqueueExtraction } from "./extractCommitments.job.js";
import { logger } from "../utils/logger.js";

// ----------------------------------------------------------------------
// Memora Backend -- syncInbox.job.js
// The pipeline's entry point: fetch new items from a connected provider,
// persist Document metadata, embed the full text for RAG, then hand off
// to extractCommitments.job.js for commitment extraction.
//
// IMPORTANT: a NormalizedItem's `fullText` (from connectorBase.js) is
// only ever held in memory during THIS job -- it's used to embed and to
// seed the extraction job's payload, then discarded. Document.js never
// stores it (see that model's comment on previewText) -- this is where
// that policy is actually enforced, not just documented.
// ----------------------------------------------------------------------

const QUEUE_NAME = "sync-inbox";
const MAX_PAGES_PER_RUN = 20; // safety cap -- a single sync run shouldn't paginate forever on a huge mailbox

export const syncQueue = new Queue(QUEUE_NAME, { connection: bullConnection });

/** Called by connections.controller.js and sync.controller.js to trigger a sync. */
export async function enqueueSync({ connectedAccountId, userId, isInitial = false }) {
  await syncQueue.add(
    "sync",
    { connectedAccountId, userId, isInitial },
    {
      removeOnComplete: { age: 3600 }, // keep for 1h for debugging, then clean up
      removeOnFail: { age: 86400 },
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
    }
  );
}

async function processSync(job) {
  const { connectedAccountId, userId, isInitial } = job.data;

  const account = await ConnectedAccount.findById(connectedAccountId);
  if (!account || account.status === "disconnected") {
    logger.info("syncInbox: account missing or disconnected, skipping", { connectedAccountId });
    return;
  }

  const connector = getConnector(account.provider);
  if (!connector) {
    logger.error("syncInbox: no connector for provider", { provider: account.provider });
    account.status = "error";
    account.lastSyncError = `No connector implementation for provider "${account.provider}"`;
    await account.save();
    return;
  }

  try {
    await ensureFreshToken(account, connector);

    // Incremental sync: use the stored cursor if we have one and this
    // isn't the first-ever sync; otherwise pull from the last successful
    // sync time (or everything, on true first connect).
    const sinceDate = isInitial ? undefined : account.lastSyncedAt;
    let cursor = isInitial ? undefined : account.syncCursor || undefined;

    let totalItems = 0;
    let page = 0;

    do {
      const { items, nextCursor } = await connector.fetchRecentItems(account, { cursor, sinceDate });

      for (const item of items) {
        await processItem(item, account, userId);
        totalItems++;
      }

      cursor = nextCursor;
      page++;
    } while (cursor && page < MAX_PAGES_PER_RUN);

    account.status = "connected";
    account.lastSyncedAt = new Date();
    account.syncCursor = cursor || null; // null = fully caught up; non-null = more pages remain for next run
    account.lastSyncError = undefined;
    await account.save();

    logger.info("syncInbox: sync completed", { connectedAccountId, provider: account.provider, totalItems });
  } catch (err) {
    account.status = "error";
    account.lastSyncError = err.message;
    await account.save();
    logger.error("syncInbox: sync failed", { connectedAccountId, provider: account.provider, error: err.message });
    throw err; // let BullMQ's retry/backoff handle it
  }
}

/** Persists Document metadata, embeds the full text, and queues extraction — the three things every new item needs. */
async function processItem(item, account, userId) {
  const document = await Document.findOneAndUpdate(
    { connectedAccountId: account._id, externalId: item.externalId },
    {
      userId,
      connectedAccountId: account._id,
      sourceType: sourceTypeForProvider(account.provider),
      externalId: item.externalId,
      title: item.title,
      previewText: item.previewText,
      url: item.url,
      occurredAt: item.occurredAt,
      status: "pending",
    },
    { upsert: true, new: true, setDefaultOnInsert: true }
  );

  try {
    const chunkCount = await embedAndStoreDocument(document, item.fullText, userId);
    document.chunkCount = chunkCount;
    document.status = "chunked";
    await document.save();

    await enqueueExtraction({
      documentId: document.id,
      userId,
      connectedAccountId: account.id,
      text: item.fullText, // held only in the Redis job payload, briefly — never written to Mongo
      sourceType: document.sourceType,
      sourceLabel: document.title,
      sourceUrl: document.url,
      occurredAt: document.occurredAt,
    });
  } catch (err) {
    document.status = "failed";
    document.processingError = err.message;
    await document.save();
    logger.warn("syncInbox: item processing failed, continuing sync", {
      documentId: document.id,
      error: err.message,
    });
  }
}

async function ensureFreshToken(account, connector) {
  if (!account.isTokenExpired()) return;

  const refreshToken = account.getRefreshToken();
  if (!refreshToken) return; // provider doesn't issue/require one (Slack, Notion)

  const refreshed = await connector.refreshAccessToken(refreshToken);
  account.setTokens({
    accessToken: refreshed.accessToken,
    refreshToken: refreshToken, // most providers don't rotate the refresh token itself
    expiresAt: refreshed.expiresAt,
  });
  await account.save();
}

function sourceTypeForProvider(provider) {
  if (provider === "calendar") return "calendar";
  if (provider === "slack" || provider === "whatsapp") return "chat";
  if (provider === "notion") return "doc";
  return "email"; // gmail, outlook
}

// ---- Worker ---------------------------------------------------------------
// Instantiated here but only actually starts consuming jobs once this
// module is imported by jobs/scheduler.js at server boot.
export const syncWorker = new Worker(QUEUE_NAME, processSync, {
  connection: bullConnection,
  concurrency: 3, // a handful of accounts syncing in parallel, not unbounded
});

syncWorker.on("failed", (job, err) => {
  logger.error("syncInbox worker: job failed permanently", { jobId: job?.id, error: err.message });
});

export default { syncQueue, syncWorker, enqueueSync };