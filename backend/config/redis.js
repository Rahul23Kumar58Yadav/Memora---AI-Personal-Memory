import Redis from "ioredis";
import { env, isProduction } from "./env.js";
import { logger } from "../utils/logger.js";

// ----------------------------------------------------------------------
// Memora Backend — redis.js
// Redis connection for BullMQ (jobs/*.job.js) and any ad-hoc caching.
// BullMQ requires `maxRetriesPerRequest: null` on the connection it's
// given — https://docs.bullmq.io/guide/going-to-production — so this
// exports a dedicated `bullConnection` separate from a general-purpose
// `redis` client used elsewhere (e.g. rate limiting).
// ----------------------------------------------------------------------

const baseOptions = {
  lazyConnect: false,
  retryStrategy: (attempts) => Math.min(attempts * 200, 5000),
  reconnectOnError: (err) => {
    // Automatically reconnect on READONLY errors (common after a
    // managed Redis failover promotes a new primary)
    return err.message.includes("READONLY");
  },
  // Upstash (and some other managed Redis providers) reset idle or
  // fresh connections more aggressively than a self-hosted Redis, which
  // combined with ioredis's default dual-stack (IPv6-first) resolution
  // on Windows can produce a connect -> ECONNRESET -> reconnect loop.
  // Forcing IPv4 and a longer connect timeout resolves this in practice.
  family: 4,
  connectTimeout: 15000,
  // TLS is already implied by the `rediss://` URL scheme, but ioredis
  // needs an explicit (even empty) tls object for some proxied/managed
  // providers to negotiate correctly rather than silently falling back.
  tls: env.REDIS_URL.startsWith("rediss://") ? {} : undefined,
};

/**
 * General-purpose client -- rate limiting, caching, refresh-token
 * whitelist. maxRetriesPerRequest is lowered from ioredis's default of
 * 20 to 5 -- at the default backoff (capped 5s/attempt), 20 retries
 * means a struggling connection can leave an HTTP request hanging for
 * ~40+ seconds before finally failing. 5 retries fails fast (a few
 * seconds) instead, and callers (see auth.controller.js's
 * storeRefreshJti) are expected to degrade gracefully rather than crash
 * the whole request when a Redis command does fail.
 */
export const redis = new Redis(env.REDIS_URL, { ...baseOptions, maxRetriesPerRequest: 5 });

/** Dedicated connection for BullMQ queues + workers (jobs/*.job.js). */
export const bullConnection = new Redis(env.REDIS_URL, {
  ...baseOptions,
  maxRetriesPerRequest: null,
});

redis.on("connect", () => logger.info("Redis connected"));
redis.on("error", (err) => logger.error(`Redis error: ${err.message}`));

bullConnection.on("connect", () => logger.info("Redis (BullMQ) connected"));
bullConnection.on("error", (err) => logger.error(`Redis (BullMQ) error: ${err.message}`));

if (!isProduction) {
  redis.on("connect", () => logger.info(`Redis target: ${env.REDIS_URL.replace(/:[^:@]*@/, ":****@")}`));
}

export async function disconnectRedis() {
  await Promise.all([redis.quit(), bullConnection.quit()]);
  logger.info("Redis connections closed");
}

export default redis;