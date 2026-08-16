import { Queue, Worker } from "bullmq";
import { bullConnection } from "../config/redis.js";
import Document from "../models/Document.js";
import Commitment from "../models/Commitment.js";
import User from "../models/User.js";
import { extractCommitments } from "../services/llm/commitmentExtractor.js";
import { logger } from "../utils/logger.js";

// ----------------------------------------------------------------------
// Memora Backend -- extractCommitments.job.js
// Runs commitmentExtractor.js (the core IP) on newly-ingested content.
// Decoupled from syncInbox.job.js into its own queue/worker so extraction
// -- the slowest, most expensive step (an LLM call per document) -- can
// scale and retry independently from the fetch+embed step, and a
// temporary LLM outage doesn't back up provider API calls.
//
// The raw text arrives as job DATA (from syncInbox.job.js), not looked
// up from Mongo -- Document.js deliberately never stores full text, so
// this is the only place it exists after the initial fetch, and only
// for the lifetime of this job.
// ----------------------------------------------------------------------

const QUEUE_NAME = "extract-commitments";

export const extractionQueue = new Queue(QUEUE_NAME, { connection: bullConnection });

/** Called by syncInbox.job.js immediately after embedding a document. */
export async function enqueueExtraction({
  documentId,
  userId,
  connectedAccountId,
  text,
  sourceType,
  sourceLabel,
  sourceUrl,
  occurredAt,
}) {
  await extractionQueue.add(
    "extract",
    { documentId, userId, connectedAccountId, text, sourceType, sourceLabel, sourceUrl, occurredAt },
    {
      // Short retention, and crucially NOT kept on the "failed" list
      // indefinitely — a failed extraction still contained someone's
      // private email text in its job payload; don't let that linger.
      removeOnComplete: { age: 600 },
      removeOnFail: { age: 3600 },
      attempts: 2,
      backoff: { type: "exponential", delay: 3000 },
    }
  );
}

async function processExtraction(job) {
  const { documentId, userId, connectedAccountId, text, sourceType, sourceLabel, sourceUrl, occurredAt } = job.data;

  const user = await User.findById(userId).select("timezone");
  const timezone = user?.timezone || "UTC";

  const extractions = await extractCommitments({ text, sourceType, occurredAt, timezone });

  if (extractions.length > 0) {
    await Commitment.insertMany(
      extractions.map((ex) => ({
        userId,
        text: ex.text,
        dueDate: ex.dueDate,
        confidence: ex.confidence,
        status: "active",
        sourceType,
        sourceLabel,
        sourceExcerpt: ex.sourceExcerpt,
        sourceUrl,
        documentId,
        connectedAccountId,
      }))
    );
  }

  await Document.findByIdAndUpdate(documentId, { status: "extracted" });

  logger.info("extractCommitments: document processed", {
    documentId,
    commitmentsFound: extractions.length,
  });
}

// ---- Worker ---------------------------------------------------------------
export const extractionWorker = new Worker(QUEUE_NAME, processExtraction, {
  connection: bullConnection,
  concurrency: 5, // extraction is I/O-bound (waiting on the LLM), safe to run more in parallel than sync
});

extractionWorker.on("failed", (job, err) => {
  logger.error("extractCommitments worker: job failed permanently", {
    jobId: job?.id,
    documentId: job?.data?.documentId,
    error: err.message,
  });
});

export default { extractionQueue, extractionWorker, enqueueExtraction };