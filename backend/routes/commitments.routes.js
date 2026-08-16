import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import * as commitmentsController from "../controllers/commitments.controller.js";

// ----------------------------------------------------------------------
// Memora Backend — commitments.routes
// Maps to api/commitments.api.js. /summary is a separate route (not
// derived from /  on the client) so DashboardPage's stat cards can fetch
// counts in one small query instead of pulling the full item list just
// to count it — matters once a user has hundreds of historical
// commitments.
// ----------------------------------------------------------------------

const router = Router();

router.use(requireAuth);

router.get("/", commitmentsController.list);
router.get("/summary", commitmentsController.getSummary);
router.get("/:id", commitmentsController.getById);
router.patch("/:id", commitmentsController.update);
router.patch("/:id/keep", commitmentsController.markKept);
router.patch("/:id/snooze", commitmentsController.snooze);
router.patch("/:id/dismiss", commitmentsController.dismiss);
router.delete("/:id", commitmentsController.remove);

export default router;