import { google } from "googleapis";
import { assertValidConnector } from "./connectorBase.js";
import { env } from "../../config/env.js";
import { logger } from "../../utils/logger.js";

// ----------------------------------------------------------------------
// Memora Backend -- gmail.service.js
// Read-only Gmail connector. Scope is deliberately gmail.readonly, never
// gmail.send or gmail.modify -- Memora reads to find commitments, it
// never sends or deletes on the user's behalf (see the trust copy in
// ConnectionsList.jsx, which this scope choice is what actually backs).
// ----------------------------------------------------------------------

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

const PAGE_SIZE = 25;

function buildOAuthClient() {
  return new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI
  );
}

const gmailConnector = {
  getAuthUrl(state) {
    const client = buildOAuthClient();
    return client.generateAuthUrl({
      access_type: "offline", // required to receive a refresh_token
      prompt: "consent", // forces refresh_token on every connect, not just the first
      scope: SCOPES,
      state,
    });
  },

  async exchangeCode(code) {
    const client = buildOAuthClient();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const oauth2 = google.oauth2({ auth: client, version: "v2" });
    const { data: profile } = await oauth2.userinfo.get();

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token, // only present on first consent -- caller must not overwrite with null on reconnect
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      accountLabel: profile.email,
      scopes: SCOPES,
    };
  },

  async refreshAccessToken(refreshToken) {
    const client = buildOAuthClient();
    client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await client.refreshAccessToken();

    return {
      accessToken: credentials.access_token,
      expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : undefined,
      scopes: SCOPES,
      accountLabel: null, // unchanged, caller keeps the existing label
    };
  },

  async fetchRecentItems(account, { cursor, sinceDate } = {}) {
    const client = buildOAuthClient();
    client.setCredentials({
      access_token: account.getAccessToken(),
      refresh_token: account.getRefreshToken(),
    });
    const gmail = google.gmail({ version: "v1", auth: client });

    const query = sinceDate ? `after:${Math.floor(sinceDate.getTime() / 1000)}` : undefined;

    const listResponse = await gmail.users.messages.list({
      userId: "me",
      maxResults: PAGE_SIZE,
      pageToken: cursor || undefined,
      q: query,
    });

    const messageRefs = listResponse.data.messages || [];
    const items = [];

    for (const ref of messageRefs) {
      try {
        const { data: message } = await gmail.users.messages.get({
          userId: "me",
          id: ref.id,
          format: "full",
        });
        items.push(normalizeMessage(message));
      } catch (err) {
        logger.warn("gmail.service: failed to fetch message, skipping", {
          messageId: ref.id,
          error: err.message,
        });
      }
    }

    return {
      items,
      nextCursor: listResponse.data.nextPageToken || null,
    };
  },

  async revokeToken(accessToken) {
    const client = buildOAuthClient();
    await client.revokeToken(accessToken);
  },
};

function normalizeMessage(message) {
  const headers = message.payload?.headers || [];
  const getHeader = (name) => headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value;

  const subject = getHeader("Subject") || "(no subject)";
  const from = getHeader("From") || "";
  const dateHeader = getHeader("Date");

  const fullText = extractPlainTextBody(message.payload);

  return {
    externalId: message.id,
    title: subject,
    previewText: message.snippet || fullText.slice(0, 500),
    fullText: `From: ${from}\nSubject: ${subject}\n\n${fullText}`,
    url: `https://mail.google.com/mail/u/0/#inbox/${message.id}`,
    occurredAt: dateHeader ? new Date(dateHeader) : new Date(Number(message.internalDate)),
  };
}

/** Walks Gmail's nested MIME part tree to find the plain-text body, decoding base64url. */
function extractPlainTextBody(payload) {
  if (!payload) return "";

  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      const text = extractPlainTextBody(part);
      if (text) return text;
    }
  }

  // Fall back to HTML body stripped of tags if no plain-text part exists
  if (payload.mimeType === "text/html" && payload.body?.data) {
    const html = decodeBase64Url(payload.body.data);
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }

  return "";
}

function decodeBase64Url(data) {
  return Buffer.from(data, "base64url").toString("utf8");
}

export default assertValidConnector(gmailConnector, "gmail");