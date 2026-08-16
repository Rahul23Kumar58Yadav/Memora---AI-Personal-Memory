import crypto from "crypto";
import ConnectedAccount from "../models/ConnectedAccount.js";
import { enqueueSync } from "../jobs/syncInbox.job.js";
import { env } from "../config/env.js";
import { safeCompare } from "../utils/encryption.js";
import { logger } from "../utils/logger.js";

// ----------------------------------------------------------------------
// Memora Backend -- webhook.controller.js
// Handlers for webhook.routes.js. No requireAuth here (see that file's
// comment) -- trust is established per-provider instead:
//   - gmailPush: a shared-secret token embedded in the URL path itself
//   - slackEvent: an HMAC signature over the raw request body
//
// Both handlers do the SAME thing once verified: find the matching
// ConnectedAccount and enqueueSync() it. This file is intentionally
// thin -- it's a trigger, not a processor; syncInbox.job.js does the
// actual work, same as a manual "sync now" click would.
// ----------------------------------------------------------------------

// ---- POST /api/webhooks/gmail/:token -----------------------------------------
export async function gmailPush(req, res) {
  const { token } = req.params;

  if (!env.GMAIL_WEBHOOK_SECRET || !safeCompare(token, env.GMAIL_WEBHOOK_SECRET)) {
    logger.warn("gmailPush: invalid webhook token");
    return res.status(401).end(); // Pub/Sub doesn't need a body, just the status
  }

  // Google Cloud Pub/Sub wraps the actual notification in a base64-encoded
  // `message.data` field: { emailAddress, historyId }
  try {
    const raw = req.body?.message?.data;
    if (!raw) {
      // Pub/Sub sends occasional empty verification pings -- ack them
      // with 200 so Pub/Sub doesn't retry, but do nothing further.
      return res.status(200).end();
    }

    const decoded = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
    const { emailAddress } = decoded;

    const account = await ConnectedAccount.findOne({
      provider: "gmail",
      accountLabel: emailAddress,
      status: { $ne: "disconnected" },
    });

    if (!account) {
      logger.warn("gmailPush: no matching connected account", { emailAddress });
      return res.status(200).end(); // still 200 -- Pub/Sub retries on non-2xx, and we simply have nothing to do
    }

    await enqueueSync({ connectedAccountId: account.id, userId: account.userId.toString(), isInitial: false });

    // Pub/Sub requires a fast 2xx ack -- the actual sync runs
    // asynchronously via the queue, not inline in this handler.
    return res.status(200).end();
  } catch (err) {
    logger.error("gmailPush: failed to process notification", { error: err.message });
    // Still ack with 200 -- returning an error here causes Pub/Sub to
    // redeliver the same notification repeatedly, which won't fix a
    // parsing bug and just spams retries.
    return res.status(200).end();
  }
}

// ---- POST /api/webhooks/slack ------------------------------------------------
export async function slackEvent(req, res) {
  if (!isValidSlackSignature(req)) {
    logger.warn("slackEvent: invalid signature");
    return res.status(401).json({ message: "Invalid signature." });
  }

  const body = JSON.parse(req.body.toString("utf8")); // req.body is a raw Buffer here — see webhook.routes.js's express.raw()

  // Slack's one-time endpoint verification handshake when you first
  // configure the Events API URL in Slack's app settings.
  if (body.type === "url_verification") {
    return res.status(200).json({ challenge: body.challenge });
  }

  if (body.type === "event_callback") {
    try {
      const account = await ConnectedAccount.findOne({
        provider: "slack",
        providerAccountId: body.team_id,
        status: { $ne: "disconnected" },
      });

      if (account) {
        await enqueueSync({ connectedAccountId: account.id, userId: account.userId.toString(), isInitial: false });
      } else {
        logger.warn("slackEvent: no matching connected account for team", { teamId: body.team_id });
      }
    } catch (err) {
      logger.error("slackEvent: failed to process event", { error: err.message });
    }
  }

  // Slack requires a fast 200 ack regardless of what we did with the
  // event, or it will retry delivery.
  return res.status(200).end();
}

function isValidSlackSignature(req) {
  if (!env.SLACK_SIGNING_SECRET) return false;

  const timestamp = req.headers["x-slack-request-timestamp"];
  const signature = req.headers["x-slack-signature"];
  if (!timestamp || !signature) return false;

  // Reject requests older than 5 minutes -- prevents a captured request
  // from being replayed indefinitely.
  const fiveMinutes = 5 * 60;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > fiveMinutes) {
    return false;
  }

  const rawBody = req.body.toString("utf8");
  const baseString = `v0:${timestamp}:${rawBody}`;
  const expectedSignature = `v0=${crypto
    .createHmac("sha256", env.SLACK_SIGNING_SECRET)
    .update(baseString)
    .digest("hex")}`;

  return safeCompare(signature, expectedSignature);
}

export default { gmailPush, slackEvent };