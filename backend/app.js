import express from "express";
import helmet from "helmet";
import cors from "cors";
import { env, isProduction } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { apiLimiter } from "./middleware/rateLimiter.middleware.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.middleware.js";

import authRoutes from "./routes/auth.routes.js";
import connectionsRoutes from "./routes/connections.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import commitmentsRoutes from "./routes/commitments.routes.js";
import digestRoutes from "./routes/digest.routes.js";
import syncRoutes from "./routes/sync.routes.js";
import webhookRoutes from "./routes/webhook.routes.js";

// ----------------------------------------------------------------------
// Memora Backend -- app.js
// Express app assembly. Exported (not started) here -- server.js owns
// actually binding a port, which keeps this file importable by test
// files (supertest can drive `app` directly without a real listening
// socket).
//
// MOUNT ORDER MATTERS, specifically around webhookRoutes: it applies
// its OWN body parsers per-route (see webhook.routes.js's comment on
// why -- Slack's signature needs the raw, unparsed body). It is
// mounted BEFORE the global express.json() below for exactly that
// reason -- if the global JSON parser ran first, Slack's raw body would
// already be consumed and re-serialized, breaking signature
// verification silently.
// ----------------------------------------------------------------------

const app = express();

// ---- Security & infra middleware ------------------------------------------
app.set("trust proxy", 1); // required for req.ip / rate limiting to work correctly behind a load balancer
app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);

if (!isProduction) {
  app.use((req, _res, next) => {
    logger.debug(`${req.method} ${req.originalUrl}`);
    next();
  });
}

// ---- Health check (before rate limiting -- uptime monitors shouldn't be throttled) ----
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ---- Webhooks: mounted BEFORE global express.json(), see comment above ----
app.use("/api/webhooks", webhookRoutes);

// ---- Global body parsing (everything else) ----------------------------------
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// ---- General rate limit for all other API routes ------------------------------
app.use("/api", apiLimiter);

// ---- Routes -----------------------------------------------------------------
app.use("/api/auth", authRoutes);
app.use("/api/connections", connectionsRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/commitments", commitmentsRoutes);
app.use("/api/digest", digestRoutes);
app.use("/api/sync", syncRoutes);

// ---- 404 + centralized error handling (must be last) --------------------------
app.use(notFoundHandler);
app.use(errorHandler);

export default app;