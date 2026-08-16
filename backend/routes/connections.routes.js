import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import * as connectionsController from "../controllers/connections.controller.js";

// ----------------------------------------------------------------------
// Memora Backend — connections.routes
// Maps to api/connections.api.js. The OAuth callback route is where
// OAuthCallback.jsx lands after the user approves access on the
// provider's own consent screen — note it's POST (frontend sends
// {code, state} in the body) even though the browser arrived via a GET
// redirect; OAuthCallback.jsx makes the POST itself after parsing the
// query string, this route never receives the raw redirect directly.
// ----------------------------------------------------------------------

const router = Router();

router.use(requireAuth); // every connections endpoint requires a signed-in user

router.get("/", connectionsController.list);
router.get("/:provider/auth-url", connectionsController.getAuthUrl);
router.post("/:provider/callback", connectionsController.completeOAuth);
router.post("/:id/sync", connectionsController.syncNow);
router.delete("/:id", connectionsController.disconnect);

export default router;