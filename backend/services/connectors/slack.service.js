import { assertValidConnector } from "./connectorBase.js";
import { env } from "../../config/env.js";
import { logger } from "../../utils/logger.js";

// ----------------------------------------------------------------------
// Memora Backend -- slack.service.js
// Slack connector via OAuth v2 (bot token). Reads channel + DM history
// the bot has been added to -- Slack does not allow reading channels a
// bot hasn't joined, which is a real (and honestly reasonable) privacy
// boundary Slack enforces on Memora's behalf.
//
// Slack's pagination is per-channel, not global, so fetchRecentItems'
// `cursor` here is a composite JSON string encoding which channel we're
// on and that channel's own Slack cursor -- lets one fetchRecentItems
// call still return a single flat cursor per connectorBase.js's shape.
// ----------------------------------------------------------------------

const SCOPES = ["channels:history", "channels:read", "groups:history", "im:history", "users:read", "team:read"];
const PAGE_SIZE = 50;
const MAX_CHANNELS_PER_SYNC = 20; // guard against runaway API usage on huge workspaces

const OAUTH_AUTHORIZE_URL = "https://slack.com/oauth/v2/authorize";
const OAUTH_TOKEN_URL = "https://slack.com/api/oauth.v2.access";
const API_BASE = "https://slack.com/api";

const slackConnector = {
  getAuthUrl(state) {
    const params = new URLSearchParams({
      client_id: env.SLACK_CLIENT_ID,
      scope: SCOPES.join(","),
      redirect_uri: env.SLACK_REDIRECT_URI,
      state,
    });
    return `${OAUTH_AUTHORIZE_URL}?${params.toString()}`;
  },

  async exchangeCode(code) {
    const response = await fetch(OAUTH_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.SLACK_CLIENT_ID,
        client_secret: env.SLACK_CLIENT_SECRET,
        code,
        redirect_uri: env.SLACK_REDIRECT_URI,
      }),
    });

    const data = await response.json();
    if (!data.ok) {
      throw new Error(`Slack OAuth exchange failed: ${data.error}`);
    }

    return {
      accessToken: data.access_token, // bot tokens (xoxb-...) do not expire or rotate
      refreshToken: null,
      expiresAt: undefined,
      accountLabel: `${data.team?.name || "Slack workspace"}`,
      providerAccountId: data.team?.id,
      scopes: SCOPES,
    };
  },

  async refreshAccessToken() {
    // Slack bot tokens are long-lived and don't use refresh tokens under
    // the standard OAuth v2 flow -- this exists only to satisfy
    // connectorBase.js's required interface.
    throw new Error("Slack tokens do not expire and cannot be refreshed. Reconnect if access was revoked.");
  },

  async fetchRecentItems(account, { cursor, sinceDate } = {}) {
    const accessToken = account.getAccessToken();
    const state = cursor ? JSON.parse(cursor) : { channelIndex: 0, channelCursor: null };

    const channels = await listAccessibleChannels(accessToken);
    if (state.channelIndex >= channels.length || state.channelIndex >= MAX_CHANNELS_PER_SYNC) {
      return { items: [], nextCursor: null }; // sync pass complete
    }

    const channel = channels[state.channelIndex];
    const oldest = sinceDate ? String(sinceDate.getTime() / 1000) : undefined;

    const historyResponse = await slackApiGet(accessToken, "conversations.history", {
      channel: channel.id,
      limit: PAGE_SIZE,
      cursor: state.channelCursor || undefined,
      oldest,
    });

    const items = (historyResponse.messages || [])
      .filter((m) => m.type === "message" && !m.subtype && m.text?.trim())
      .map((m) => normalizeMessage(m, channel));

    const hasMoreInChannel = Boolean(historyResponse.response_metadata?.next_cursor);
    const nextState = hasMoreInChannel
      ? { channelIndex: state.channelIndex, channelCursor: historyResponse.response_metadata.next_cursor }
      : { channelIndex: state.channelIndex + 1, channelCursor: null };

    const isLastChannel = nextState.channelIndex >= channels.length;

    return {
      items,
      nextCursor: isLastChannel && !hasMoreInChannel ? null : JSON.stringify(nextState),
    };
  },

  // No revokeToken -- Slack's auth.revoke is intentionally not called
  // automatically since a shared bot token may back other integrations
  // in the same workspace; disconnecting in Memora only stops Memora
  // from reading further, per ConnectedAccount's scheduleDisconnect().
};

async function listAccessibleChannels(accessToken) {
  const data = await slackApiGet(accessToken, "conversations.list", {
    types: "public_channel,private_channel,im",
    limit: 100,
    exclude_archived: true,
  });
  return data.channels || [];
}

async function slackApiGet(accessToken, method, params) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined)
  );
  const response = await fetch(`${API_BASE}/${method}?${query.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await response.json();
  if (!data.ok) {
    logger.warn("Slack API call failed", { method, error: data.error });
    throw new Error(`Slack API error (${method}): ${data.error}`);
  }
  return data;
}

function normalizeMessage(message, channel) {
  const channelLabel = channel.is_im ? "Direct message" : `#${channel.name}`;
  return {
    externalId: message.ts,
    title: channelLabel,
    previewText: message.text.slice(0, 500),
    fullText: message.text,
    url: `https://slack.com/app_redirect?channel=${channel.id}&message_ts=${message.ts}`,
    occurredAt: new Date(Number(message.ts) * 1000),
  };
}

export default assertValidConnector(slackConnector, "slack");