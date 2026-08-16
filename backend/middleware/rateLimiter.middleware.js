import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { redis } from "../config/redis.js";

// ----------------------------------------------------------------------
// Memora Backend -- rateLimiter.middleware
// Named limiters, tuned per endpoint cost/risk rather than one global
// limit for the whole API:
//   - authLimiter    -- brute-force protection on login/signup/refresh
//   - chatLimiter    -- each call is an embedding + LLM round trip ($$$)
//   - syncLimiter    -- each call enqueues real provider API calls
//   - apiLimiter     -- general fallback for everything else
// Backed by Redis (not in-memory) so limits hold correctly across
// multiple server instances behind a load balancer.
// ----------------------------------------------------------------------

function makeLimiter({ windowMs, max, message, prefix }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      sendCommand: (...args) => redis.call(...args),
      prefix: `rl:${prefix}:`,
    }),
    message: { message: message || "Too many requests. Please slow down and try again shortly." },
    // Rate limit per authenticated user when available, falling back to
    // IP for unauthenticated routes (login/signup) -- prevents one
    // heavy user's chat usage from throttling everyone sharing their IP.
    // ipKeyGenerator() normalizes IPv6 addresses (collapses to a /64
    // prefix) so a single IPv6 user can't dodge the limit by rotating
    // the trailing bits of their address -- required by express-rate-limit
    // v7+, see https://express-rate-limit.github.io/ERR_ERL_KEY_GEN_IPV6/
    keyGenerator: (req) => req.userId || ipKeyGenerator(req.ip),
  });
}

export const authLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  prefix: "auth",
  message: "Too many attempts. Please wait a few minutes before trying again.",
});

export const chatLimiter = makeLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  prefix: "chat",
  message: "You're asking faster than Memora can look things up. Give it a moment.",
});

export const syncLimiter = makeLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3,
  prefix: "sync",
  message: "A sync was just triggered. Wait a few minutes before requesting another.",
});

export const apiLimiter = makeLimiter({
  windowMs: 60 * 1000,
  max: 120,
  prefix: "api",
});