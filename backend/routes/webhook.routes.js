import { Router } from "express";
import express from "express";
import * as webhookController from "../controllers/webhook.controller.js";

// ----------------------------------------------------------------------
// Memora Backend — webhook.routes
// Inbound calls from external providers, not from Memora's own frontend
// -- so NO requireAuth here. Trust is established per-provider instead:
//   - Gmail (Google Cloud Pub/Sub push): a shared secret token in the
//     URL path, checked in webhookController.gmailPush.
//   - Slack (Events API): an HMAC signature over the raw request body,
//     checked in webhookController.slackEvent.
//
// CRITICAL: both signature checks need the RAW, unparsed request body --
// Slack's signature is computed over the exact bytes it sent, and
// re-serializing JSON after express.json() parses it can produce
// byte-for-byte different output (key order, whitespace), which breaks
// verification silently. That's why this router applies express.raw()
// itself rather than relying on the global JSON body parser mounted in
// app.js -- make sure app.js does NOT apply express.json() ahead of
// this router, or excludes this path from it.
// ----------------------------------------------------------------------

const router = Router();

// Gmail Pub/Sub push delivers a JSON envelope; the shared-secret token
// lives in the URL, not a signature over the body, so JSON parsing here
// is fine.
router.post("/gmail/:token", express.json(), webhookController.gmailPush);

// Slack requires the raw body for HMAC verification -- do not use
// express.json() on this route.
router.post(
  "/slack",
  express.raw({ type: "application/json" }),
  webhookController.slackEvent
);

export default router;