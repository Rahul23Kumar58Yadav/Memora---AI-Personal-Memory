import { assertValidConnector } from "./connectorBase.js";
import { env } from "../../config/env.js";
import { logger } from "../../utils/logger.js";

// ----------------------------------------------------------------------
// Memora Backend -- notion.service.js
// Notion connector via its public OAuth integration. Indexes pages the
// user has explicitly granted the integration access to during the
// consent flow -- Notion's own permission model (page-by-page grant,
// not workspace-wide by default) is another provider-enforced boundary
// working in Memora's favor here, same as Slack's "bot must be in the
// channel" rule.
// ----------------------------------------------------------------------

const NOTION_API_VERSION = "2022-06-28";
const API_BASE = "https://api.notion.com/v1";
const PAGE_SIZE = 25;

const notionConnector = {
  getAuthUrl(state) {
    const params = new URLSearchParams({
      client_id: env.NOTION_CLIENT_ID,
      redirect_uri: env.NOTION_REDIRECT_URI,
      response_type: "code",
      owner: "user",
      state,
    });
    return `https://api.notion.com/v1/oauth/authorize?${params.toString()}`;
  },

  async exchangeCode(code) {
    const basicAuth = Buffer.from(`${env.NOTION_CLIENT_ID}:${env.NOTION_CLIENT_SECRET}`).toString("base64");

    const response = await fetch(`${API_BASE}/oauth/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: env.NOTION_REDIRECT_URI,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Notion OAuth exchange failed: ${data.error || response.statusText}`);
    }

    return {
      accessToken: data.access_token, // Notion internal integration tokens do not expire
      refreshToken: null,
      expiresAt: undefined,
      accountLabel: data.workspace_name || "Notion workspace",
      scopes: ["read"],
    };
  },

  async refreshAccessToken() {
    // Notion's OAuth tokens don't expire under the standard flow -- same
    // situation as Slack. Present to satisfy connectorBase.js's contract.
    throw new Error("Notion tokens do not expire and cannot be refreshed. Reconnect if access was revoked.");
  },

  async fetchRecentItems(account, { cursor, sinceDate } = {}) {
    const accessToken = account.getAccessToken();

    const searchResponse = await notionApiPost(accessToken, "/search", {
      sort: { direction: "descending", timestamp: "last_edited_time" },
      page_size: PAGE_SIZE,
      start_cursor: cursor || undefined,
      filter: { property: "object", value: "page" },
    });

    const pages = searchResponse.results || [];
    const items = [];

    for (const page of pages) {
      const editedAt = new Date(page.last_edited_time);
      if (sinceDate && editedAt < sinceDate) continue; // stop pulling full content for pages older than the sync window

      try {
        const text = await fetchPageText(accessToken, page.id);
        items.push(normalizePage(page, text));
      } catch (err) {
        logger.warn("notion.service: failed to fetch page content, skipping", {
          pageId: page.id,
          error: err.message,
        });
      }
    }

    return {
      items,
      nextCursor: searchResponse.has_more ? searchResponse.next_cursor : null,
    };
  },

  // No revokeToken -- Notion has no public token-revocation endpoint;
  // disconnecting relies on ConnectedAccount's scheduleDisconnect() plus
  // the user optionally removing the integration from Notion's own
  // workspace settings.
};

async function fetchPageText(accessToken, pageId, depth = 0) {
  if (depth > 2) return ""; // cap recursion into deeply nested blocks

  const data = await notionApiGet(accessToken, `/blocks/${pageId}/children?page_size=100`);
  let text = "";

  for (const block of data.results || []) {
    text += extractBlockText(block) + "\n";
    if (block.has_children) {
      text += await fetchPageText(accessToken, block.id, depth + 1);
    }
  }

  return text;
}

function extractBlockText(block) {
  const richText = block[block.type]?.rich_text;
  if (!Array.isArray(richText)) return "";
  return richText.map((t) => t.plain_text).join("");
}

function normalizePage(page, fullText) {
  const title = extractPageTitle(page);
  return {
    externalId: page.id,
    title,
    previewText: fullText.slice(0, 500),
    fullText: `${title}\n\n${fullText}`,
    url: page.url,
    occurredAt: new Date(page.last_edited_time),
  };
}

function extractPageTitle(page) {
  const titleProp = Object.values(page.properties || {}).find((p) => p.type === "title");
  const richText = titleProp?.title;
  if (Array.isArray(richText) && richText.length > 0) {
    return richText.map((t) => t.plain_text).join("");
  }
  return "(untitled page)";
}

async function notionApiPost(accessToken, path, body) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Notion-Version": NOTION_API_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`Notion API error: ${data.message || response.statusText}`);
  return data;
}

async function notionApiGet(accessToken, path) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Notion-Version": NOTION_API_VERSION,
    },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`Notion API error: ${data.message || response.statusText}`);
  return data;
}

export default assertValidConnector(notionConnector, "notion");