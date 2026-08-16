import app from "./app.js";
import { env } from "./config/env.js";
import { connectDB, disconnectDB } from "./config/db.js";
import { disconnectRedis } from "./config/redis.js";
import { initializeJobs, shutdownJobs } from "./jobs/scheduler.js";
import { logger } from "./utils/logger.js";

// ----------------------------------------------------------------------
// Memora Backend -- server.js
// Entry point. Boot order matters:
//   1. connectDB()      -- must succeed before anything touches Mongo
//   2. initializeJobs()  -- starts BullMQ workers + cron sweeps; MUST run
//                           after connectDB(), or the first job that
//                           fires crashes querying a database that
//                           isn't connected yet
//   3. app.listen()      -- start accepting HTTP traffic last, so a
//                           health check never returns 200 before the
//                           app can actually serve real requests
// ----------------------------------------------------------------------

let httpServer;

async function start() {
  try {
    await connectDB();
    initializeJobs();

    httpServer = app.listen(env.PORT, () => {
      logger.info(`Memora backend listening on port ${env.PORT} (${env.NODE_ENV})`);
    });
  } catch (err) {
    logger.error(`Failed to start server: ${err.message}`);
    process.exit(1);
  }
}

// ---- Graceful shutdown -------------------------------------------------------
// A pod/dyno restart or deploy sends SIGTERM before killing the process
// -- without handling it, in-flight requests get dropped and BullMQ
// workers get killed mid-job instead of finishing or cleanly re-queuing.
async function shutdown(signal) {
  logger.info(`${signal} received, shutting down gracefully...`);

  const forceExitTimer = setTimeout(() => {
    logger.error("Graceful shutdown timed out, forcing exit");
    process.exit(1);
  }, 15000);

  try {
    if (httpServer) {
      await new Promise((resolve) => httpServer.close(resolve));
      logger.info("HTTP server closed");
    }

    await shutdownJobs();
    await disconnectRedis();
    await disconnectDB();

    clearTimeout(forceExitTimer);
    logger.info("Shutdown complete");
    process.exit(0);
  } catch (err) {
    logger.error(`Error during shutdown: ${err.message}`);
    process.exit(1);
  }
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  logger.error(`Unhandled promise rejection: ${reason}`);
});
process.on("uncaughtException", (err) => {
  // A transient socket reset on one of Redis/ioredis's internal
  // connections (BullMQ duplicates the given connection for blocking
  // commands) is benign and self-heals via ioredis's own retryStrategy
  // -- it should not take the whole process down. Anything else
  // uncaught is treated as a real crash.
  if (err.code === "ECONNRESET" && err.syscall === "read") {
    logger.warn("Transient connection reset (auto-recovering)", { message: err.message });
    return;
  }

  logger.error(`Uncaught exception: ${err.message}`);
  // An uncaught exception leaves the process in an unknown state --
  // exit rather than keep serving traffic from something potentially
  // corrupted. A process manager (PM2, Docker restart policy, k8s)
  // should bring it back up clean.
  process.exit(1);
});

start();