import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import * as digestController from "../controllers/digest.controller.js";

// ----------------------------------------------------------------------
// Memora Backend — digest.routes
// Maps to api/digest.api.js. /settings reads/writes User.digestSettings
// directly (see User.js) rather than a separate collection -- there's
// only ever one settings object per user, so a dedicated collection
// would just be a join for no benefit. /send-now exists for the
// "did I actually connect this right" moment right after onboarding,
// so a user isn't stuck waiting until tomorrow morning to see a digest.
// ----------------------------------------------------------------------

const router = Router();

router.use(requireAuth);

router.get("/", digestController.list);
router.get("/latest", digestController.getLatest);
router.get("/settings", digestController.getSettings);
router.patch("/settings", digestController.updateSettings);
router.post("/send-now", digestController.sendNow);
router.get("/:id", digestController.getById);

export default router;