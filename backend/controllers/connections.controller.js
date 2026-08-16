import crypto from "crypto";
import ConnectedAccount from "../models/ConnectedAccount.js";
import { redis } from "../config/redis.js";
import { getConnector } from "../services/connectors/index.js";
import { enqueueSync } from "../jobs/syncInbox.job.js";
import { logger } from "../utils/logger.js";

// ----------------------------------------------------------------------
// Memora Backend — connections.controller
// Maps to connections.routes.js. Provider-specific OAuth logic (URL
// building, code exchange, token refresh) lives behind getConnector(id)
// — see services/connectors/index.js — this controller only handles
// the parts common to every provider: CSRF state, persistence,
// encryption (via ConnectedAccount model methods), and sync triggers.
// ----------------------------------------------------------------------

const STATE_TTL_SECONDS = 10 * 60; // OAuth flow must complete within 10 minutes

// ---- GET /connections ---------------------------------------------------------
export async function list(req, res, next) {
  try {
    const accounts = await ConnectedAccount.find({
      userId: req.userId,
      status: { $ne: "disconnected" },
    }).sort({ createdAt: 1 });

    const connections = accounts.map((a) => ({
      id: a.id,
      name: providerDisplayName(a.provider),
      account: a.accountLabel,
      scope: providerScopeDescription(a.provider),
      lastSync: a.lastSyncedAt,
      status: a.status,
    }));

    return res.json({ connections });
  } catch (err) {
    next(err);
  }
}

// ---- GET /connections/:provider/auth-url ---------------------------------------
export async function getAuthUrl(req, res, next) {
  try {
    const { provider } = req.params;
    const connector = getConnector(provider);
    if (!connector) {
      return res.status(400).json({ message: `Unknown provider: ${provider}` });
    }

    // CSRF-protect the flow: a random state tied to this user, checked
    // again in completeOAuth before any tokens are exchanged.
    const state = crypto.randomUUID();
    await redis.set(`oauth_state:${state}`, req.userId, "EX", STATE_TTL_SECONDS);

    const url = connector.getAuthUrl(state);
    return res.json({ url });
  } catch (err) {
    next(err);
  }
}

// ---- POST /connections/:provider/callback --------------------------------------
export async function completeOAuth(req, res, next) {
  try {
    const { provider } = req.params;
    const { code, state } = req.body;

    if (!code || !state) {
      return res.status(400).json({ message: "Missing authorization code or state." });
    }

    const stateUserId = await redis.get(`oauth_state:${state}`);
    if (!stateUserId || stateUserId !== req.userId) {
      return res.status(400).json({ message: "This authorization request has expired or is invalid." });
    }
    await redis.del(`oauth_state:${state}`);

    const connector = getConnector(provider);
    if (!connector) {
      return res.status(400).json({ message: `Unknown provider: ${provider}` });
    }

    // exchangeCode returns { accessToken, refreshToken, expiresAt, accountLabel, scopes }
    const tokenData = await connector.exchangeCode(code);

    let account = await ConnectedAccount.findOne({ userId: req.userId, provider });
    if (!account) {
      account = new ConnectedAccount({ userId: req.userId, provider, accountLabel: tokenData.accountLabel });
    }

    account.accountLabel = tokenData.accountLabel;
    account.scopes = tokenData.scopes || [];
    account.status = "connected";
    account.setTokens(tokenData); // encrypts + stores accessToken/refreshToken
    await account.save();

    logger.info("Connection established", { userId: req.userId, provider });

    // Kick off an initial sync immediately so the connection doesn't
    // sit empty until the next scheduled run.
    await enqueueSync({ connectedAccountId: account.id, userId: req.userId, isInitial: true });

    return res.json({
      connection: {
        id: account.id,
        name: providerDisplayName(provider),
        account: account.accountLabel,
        scope: providerScopeDescription(provider),
        status: "syncing",
      },
    });
  } catch (err) {
    next(err);
  }
}

// ---- POST /connections/:id/sync -------------------------------------------------
export async function syncNow(req, res, next) {
  try {
    const account = await ConnectedAccount.findOne({ _id: req.params.id, userId: req.userId });
    if (!account) {
      return res.status(404).json({ message: "Connection not found." });
    }

    account.status = "syncing";
    await account.save();

    await enqueueSync({ connectedAccountId: account.id, userId: req.userId, isInitial: false });

    return res.json({ connection: account });
  } catch (err) {
    next(err);
  }
}

// ---- DELETE /connections/:id -----------------------------------------------------
export async function disconnect(req, res, next) {
  try {
    const account = await ConnectedAccount.findOne({ _id: req.params.id, userId: req.userId });
    if (!account) {
      return res.status(404).json({ message: "Connection not found." });
    }

    // Best-effort token revocation with the provider — never let a
    // revocation failure block the user from disconnecting on their end.
    try {
      const connector = getConnector(account.provider);
      await connector?.revokeToken?.(account.getAccessToken());
    } catch (revokeErr) {
      logger.warn("Token revocation failed (continuing with local disconnect)", {
        provider: account.provider,
        error: revokeErr.message,
      });
    }

    account.scheduleDisconnect(); // sets purgeAfter TTL — see ConnectedAccount.js
    await account.save();

    return res.json({ message: "Disconnected. Data will be fully erased within 24 hours." });
  } catch (err) {
    next(err);
  }
}

// ---- Display helpers --------------------------------------------------------------
function providerDisplayName(provider) {
  const names = {
    gmail: "Gmail",
    outlook: "Outlook",
    calendar: "Google Calendar",
    slack: "Slack",
    whatsapp: "WhatsApp Business",
    notion: "Notion",
  };
  return names[provider] || provider;
}

function providerScopeDescription(provider) {
  const scopes = {
    gmail: "Reads message content to find commitments. Never sends on your behalf.",
    outlook: "Reads message content to find commitments. Never sends on your behalf.",
    calendar: "Reads event titles and times to cross-check deadlines.",
    slack: "Reads message text from channels and DMs to extract promises.",
    whatsapp: "Reads message text from linked chats to extract promises.",
    notion: "Indexes meeting notes and project docs.",
  };
  return scopes[provider] || "";
}