import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import User from "../models/User.js";

// ----------------------------------------------------------------------
// Memora Backend — auth.middleware
// Verifies the access token on protected routes. Mirrors the frontend's
// axiosClient.js expectation: a 401 here is exactly what triggers its
// refresh-token flow, so the error SHAPE matters -- always
// { message, code: "TOKEN_EXPIRED" | "TOKEN_INVALID" }, never a bare
// 401 with no body, or the frontend can't distinguish "expired, try
// refreshing" from "invalid, force logout".
// ----------------------------------------------------------------------

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No access token provided.", code: "TOKEN_MISSING" });
    }

    const token = header.slice(7);

    let payload;
    try {
      payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Access token expired.", code: "TOKEN_EXPIRED" });
      }
      return res.status(401).json({ message: "Invalid access token.", code: "TOKEN_INVALID" });
    }

    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(401).json({ message: "User no longer exists.", code: "TOKEN_INVALID" });
    }

    req.user = user; // full Mongoose doc -- controllers can call .toPublicJSON()
    req.userId = user._id.toString();
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Optional auth -- attaches req.user if a valid token is present, but
 * doesn't reject the request otherwise. Not used by any route yet, but
 * kept available for future public-but-personalized endpoints.
 */
export async function attachUserIfPresent(req, _res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return next();

  try {
    const payload = jwt.verify(header.slice(7), env.JWT_ACCESS_SECRET);
    const user = await User.findById(payload.sub);
    if (user) {
      req.user = user;
      req.userId = user._id.toString();
    }
  } catch {
    // Silently ignore -- this middleware never blocks the request
  }
  next();
}