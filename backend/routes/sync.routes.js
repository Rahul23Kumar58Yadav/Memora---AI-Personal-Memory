import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { syncLimiter } from "../middleware/rateLimiter.middleware.js";
import * as syncController from "../controllers/sync.controller.js";

// ----------------------------------------------------------------------
// Memora Backend — sync.routes
// Cross-account sync operations. Per-connection sync (POST
// /connections/:id/sync) already lives in connections.routes.js for the
// "sync just this one account" case from ConnectionCard's options menu;
// this file is for operations that span every connected account at
// once, which connections.routes.js has no natural place for.
//
// Heavily rate-limited -- a sync run enqueues real jobs (fetch + chunk +
// embed + extract) against every connected provider, so an "resync
// everything" button that could be clicked repeatedly needs a hard
// ceiling, not just the general API limiter.
// ----------------------------------------------------------------------

const router = Router();

router.use(requireAuth);

/** Triggers an immediate sync across every connected account for this user. */
router.post("/all", syncLimiter, syncController.syncAll);

/**
 * Poll-friendly status check -- lets the frontend show a "syncing..."
 * indicator without needing websockets. Cheap read, no rate limit.
 */
router.get("/status", syncController.getStatus);

export default router;