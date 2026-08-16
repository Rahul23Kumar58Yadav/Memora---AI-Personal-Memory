import jwt from "jsonwebtoken";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";
import { env } from "../config/env.js";
import { redis } from "../config/redis.js";
import { logger } from "../utils/logger.js";

// ----------------------------------------------------------------------
// Memora Backend — auth.controller
// Maps to auth.routes.js. Token strategy:
//   - Access token: short-lived JWT (15m), verified stateless by
//     auth.middleware.js on every request.
//   - Refresh token: longer-lived JWT (30d) whose jti is tracked in
//     Redis so logout can actually revoke it — a stateless refresh
//     token can't be invalidated before its natural expiry otherwise,
//     which matters if a device is lost or a user asks to be logged out
//     everywhere.
// ----------------------------------------------------------------------

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);
const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days, mirrors JWT_REFRESH_EXPIRES_IN

function issueTokenPair(userId) {
  const jti = crypto.randomUUID();

  const accessToken = jwt.sign({ sub: userId }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  });

  const refreshToken = jwt.sign({ sub: userId, jti }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  });

  return { accessToken, refreshToken, jti };
}

async function storeRefreshJti(userId, jti) {
  // Whitelist, not blocklist: only a jti present here is considered
  // valid. Logout deletes the key; refresh rotation replaces it.
  //
  // Wrapped defensively: if Redis is briefly unreachable/flapping, a
  // user should still be able to sign up and log in -- they just won't
  // be able to use /refresh until Redis recovers (their access token
  // still works for 15 minutes). Losing the ability to revoke a
  // refresh token early is a much smaller problem than losing the
  // ability to create an account at all.
  try {
    await redis.set(`refresh:${userId}:${jti}`, "1", "EX", REFRESH_TTL_SECONDS);
  } catch (err) {
    logger.error("storeRefreshJti failed -- continuing without refresh-token whitelist entry", {
      userId,
      error: err.message,
    });
  }
}

async function isRefreshJtiValid(userId, jti) {
  return Boolean(await redis.get(`refresh:${userId}:${jti}`));
}

async function revokeRefreshJti(userId, jti) {
  await redis.del(`refresh:${userId}:${jti}`);
}

async function respondWithSession(res, user, status = 200) {
  const { accessToken, refreshToken, jti } = issueTokenPair(user._id.toString());
  await storeRefreshJti(user._id.toString(), jti);
  return res.status(status).json({ accessToken, refreshToken, user: user.toPublicJSON() });
}

// ---- POST /auth/signup ----------------------------------------------------
export async function signup(req, res, next) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are all required." });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters." });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    const user = await User.create({ name, email: email.toLowerCase(), passwordHash: password });
    logger.info("User signed up", { userId: user._id.toString() });

    return respondWithSession(res, user, 201);
  } catch (err) {
    next(err);
  }
}

// ---- POST /auth/login ------------------------------------------------------
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select("+passwordHash");
    const passwordMatches = user ? await user.comparePassword(password) : false;

    // Deliberately identical response for "no such user" and "wrong
    // password" — distinguishing them lets an attacker enumerate valid
    // emails against the login endpoint.
    if (!user || !passwordMatches) {
      return res.status(401).json({ message: "Incorrect email or password." });
    }

    user.lastLoginAt = new Date();
    await user.save();

    return respondWithSession(res, user);
  } catch (err) {
    next(err);
  }
}

// ---- POST /auth/google ------------------------------------------------------
export async function loginWithGoogle(req, res, next) {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ message: "Missing Google idToken." });
    }

    const ticket = await googleClient.verifyIdToken({ idToken, audience: env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    if (!payload?.email) {
      return res.status(401).json({ message: "Could not verify Google account." });
    }

    let user = await User.findOne({ $or: [{ googleId: payload.sub }, { email: payload.email.toLowerCase() }] });

    if (!user) {
      user = await User.create({
        name: payload.name || payload.email.split("@")[0],
        email: payload.email.toLowerCase(),
        googleId: payload.sub,
        avatarUrl: payload.picture,
        isEmailVerified: payload.email_verified ?? true,
      });
    } else if (!user.googleId) {
      user.googleId = payload.sub; // link an existing password account to Google
      await user.save();
    }

    user.lastLoginAt = new Date();
    await user.save();

    return respondWithSession(res, user);
  } catch (err) {
    if (err.message?.includes("Token used too late") || err.message?.includes("Wrong recipient")) {
      return res.status(401).json({ message: "Google sign-in could not be verified." });
    }
    next(err);
  }
}

// ---- POST /auth/refresh -----------------------------------------------------
export async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ message: "Missing refresh token." });
    }

    let payload;
    try {
      payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ message: "Refresh token is invalid or expired." });
    }

    const valid = await isRefreshJtiValid(payload.sub, payload.jti);
    if (!valid) {
      return res.status(401).json({ message: "This session has been revoked. Please log in again." });
    }

    // Rotate: revoke the old jti, issue a brand new pair. Prevents a
    // stolen refresh token from being replayed indefinitely alongside
    // the legitimate user's session.
    await revokeRefreshJti(payload.sub, payload.jti);

    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(401).json({ message: "User no longer exists." });
    }

    const { accessToken, refreshToken: newRefreshToken, jti } = issueTokenPair(user._id.toString());
    await storeRefreshJti(user._id.toString(), jti);

    return res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (err) {
    next(err);
  }
}

// ---- POST /auth/logout -------------------------------------------------------
export async function logout(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      try {
        const payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
        await revokeRefreshJti(payload.sub, payload.jti);
      } catch {
        // Already invalid/expired — nothing to revoke, not an error.
      }
    }
    return res.status(204).end();
  } catch (err) {
    next(err);
  }
}

// ---- GET /auth/me -------------------------------------------------------------
export async function getCurrentUser(req, res) {
  return res.json({ user: req.user.toPublicJSON() });
}

// ---- POST /auth/forgot-password ------------------------------------------------
export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });

    // Always return success regardless of whether the account exists —
    // otherwise this endpoint becomes an email-enumeration oracle.
    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      user.passwordResetToken = crypto.createHash("sha256").update(token).digest("hex");
      user.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await user.save();

      // TODO: send via services/notification.service.js — email with a
      // link to `${env.CLIENT_URL}/reset-password?token=${token}`
      logger.info("Password reset requested", { userId: user._id.toString() });
    }

    return res.json({ message: "If that email exists, a reset link has been sent." });
  } catch (err) {
    next(err);
  }
}

// ---- POST /auth/reset-password -------------------------------------------------
export async function resetPassword(req, res, next) {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ message: "Token and new password are required." });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters." });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpiresAt: { $gt: new Date() },
    }).select("+passwordResetToken +passwordResetExpiresAt");

    if (!user) {
      return res.status(400).json({ message: "This reset link is invalid or has expired." });
    }

    user.passwordHash = newPassword; // re-hashed by the pre-save hook
    user.passwordResetToken = undefined;
    user.passwordResetExpiresAt = undefined;
    await user.save();

    return res.json({ message: "Password updated. You can now log in." });
  } catch (err) {
    next(err);
  }
}