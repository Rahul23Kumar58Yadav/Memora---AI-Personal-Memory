import { isProduction } from "../config/env.js";
import { logger } from "../utils/logger.js";

// ----------------------------------------------------------------------
// Memora Backend -- errorHandler.middleware
// Single centralized error handler, mounted LAST in app.js (after every
// route). Every controller in this codebase calls next(err) on failure
// rather than handling errors inline -- this is where they all land.
//
// Response shape is deliberately always { message } (+ optional `code`)
// -- this matches exactly what the frontend's axiosClient.js normalizes
// every error into (error.response?.data?.message), so no controller
// error goes un-surfaced to the UI as a generic "Something went wrong."
// ----------------------------------------------------------------------

/** Mounted before errorHandler in app.js -- turns any unmatched route into a proper 404 instead of Express's default HTML page. */
export function notFoundHandler(req, res) {
  res.status(404).json({ message: `No route matches ${req.method} ${req.originalUrl}` });
}

export function errorHandler(err, req, res, _next) {
  const { status, message, code, details } = normalizeError(err);

  if (status >= 500) {
    logger.error(`Unhandled error: ${message}`, {
      path: req.originalUrl,
      method: req.method,
      userId: req.userId,
      stack: isProduction ? undefined : err.stack,
    });
  } else {
    logger.warn(`Request error: ${message}`, { path: req.originalUrl, status });
  }

  const body = { message };
  if (code) body.code = code;
  if (details) body.details = details;
  // Stack traces are a real information leak (file paths, dependency
  // versions) -- never include them outside development.
  if (!isProduction && err.stack) body.stack = err.stack;

  res.status(status).json(body);
}

function normalizeError(err) {
  // Zod validation errors (from validate.middleware.js)
  if (err.name === "ZodError") {
    return {
      status: 400,
      message: "Invalid request data.",
      code: "VALIDATION_ERROR",
      details: err.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    };
  }

  // Mongoose validation errors
  if (err.name === "ValidationError" && err.errors) {
    return {
      status: 400,
      message: "Invalid data.",
      code: "VALIDATION_ERROR",
      details: Object.values(err.errors).map((e) => ({ path: e.path, message: e.message })),
    };
  }

  // Mongoose duplicate key error (e.g. email already exists, or the
  // (userId, provider) unique index on ConnectedAccount)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || "field";
    return { status: 409, message: `That ${field} is already in use.`, code: "DUPLICATE" };
  }

  // Mongoose bad ObjectId (malformed :id route param)
  if (err.name === "CastError") {
    return { status: 400, message: "Invalid identifier.", code: "INVALID_ID" };
  }

  // JWT errors that somehow reach here instead of being caught in
  // auth.middleware.js directly (e.g. thrown inside a controller)
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    return { status: 401, message: "Invalid or expired session.", code: "TOKEN_INVALID" };
  }

  // Errors deliberately thrown by a controller with a status attached
  // (e.g. `const e = new Error("..."); e.status = 404; throw e;`)
  if (err.status || err.statusCode) {
    return { status: err.status || err.statusCode, message: err.message, code: err.code };
  }

  // Anthropic/embedding provider errors — surface as 502 (upstream
  // failure), not 500 (our own bug), and never leak the raw provider
  // error message which may include request internals.
  if (err.status === 429 || /rate.?limit/i.test(err.message || "")) {
    return { status: 429, message: "Memora is a little overloaded right now. Try again shortly.", code: "UPSTREAM_RATE_LIMIT" };
  }

  // Fallback — genuinely unexpected error
  return {
    status: 500,
    message: isProduction ? "Something went wrong on our end. Please try again." : err.message,
    code: "INTERNAL_ERROR",
  };
}

export default { errorHandler, notFoundHandler };