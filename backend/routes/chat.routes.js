import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { chatLimiter } from "../middleware/rateLimiter.middleware.js";
import * as chatController from "../controllers/chat.controller.js";

// ----------------------------------------------------------------------
// Memora Backend — chat.routes
// Maps to api/chat.api.js. /query is rate-limited separately from the
// general API limiter — each call triggers an embedding + LLM round
// trip, which is both the slowest and most expensive-to-run endpoint
// in the app, so it needs a tighter ceiling than CRUD routes.
// ----------------------------------------------------------------------

const router = Router();

router.use(requireAuth);

router.post("/query", chatLimiter, chatController.ask);
router.get("/sessions", chatController.listSessions);
router.get("/sessions/:id", chatController.getSession);
router.delete("/sessions/:id", chatController.deleteSession);

export default router;