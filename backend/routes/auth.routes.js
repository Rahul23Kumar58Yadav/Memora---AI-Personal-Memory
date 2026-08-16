import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { authLimiter } from "../middleware/rateLimiter.middleware.js";
import * as authController from "../controllers/auth.controller.js";

// ----------------------------------------------------------------------
// Memora Backend — auth.routes
// Maps to api/auth.api.js on the frontend exactly. Signup/login/refresh
// are rate-limited harder than the rest of the API (see authLimiter) —
// this endpoint is the highest-value brute-force target in the app.
// ----------------------------------------------------------------------

const router = Router();

router.post("/signup", authLimiter, authController.signup);
router.post("/login", authLimiter, authController.login);
router.post("/google", authLimiter, authController.loginWithGoogle);
router.post("/refresh", authLimiter, authController.refresh);
router.post("/logout", requireAuth, authController.logout);
router.get("/me", requireAuth, authController.getCurrentUser);

router.post("/forgot-password", authLimiter, authController.forgotPassword);
router.post("/reset-password", authLimiter, authController.resetPassword);

export default router;