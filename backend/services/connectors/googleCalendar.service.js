import { google } from "googleapis";
import { assertValidConnector } from "./connectorBase.js";
import { env } from "../../config/env.js";

// ----------------------------------------------------------------------
// Memora Backend -- googleCalendar.service.js
// Read-only Calendar connector, used to cross-check deadlines and catch
// commitments made in event descriptions ("bring the signed contract").
// Shares the same Google OAuth app as gmail.service.js in practice, but
// kept as a separate connector/scope so a user can connect Gmail without
// Calendar (or vice versa) -- see ConnectionCard.jsx, each provider is
// its own row with its own consent.
// ----------------------------------------------------------------------

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

const PAGE_SIZE = 50;

function buildOAuthClient() {
  return new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI
  );
}

const calendarConnector = {
  getAuthUrl(state) {
    const client = buildOAuthClient();
    return client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
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
      refreshToken: tokens.refresh_token,
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
      accountLabel: null,
    };
  },

  async fetchRecentItems(account, { cursor, sinceDate } = {}) {
    const client = buildOAuthClient();
    client.setCredentials({
      access_token: account.getAccessToken(),
      refresh_token: account.getRefreshToken(),
    });
    const calendar = google.calendar({ version: "v3", auth: client });

    const response = await calendar.events.list({
      calendarId: "primary",
      maxResults: PAGE_SIZE,
      pageToken: cursor || undefined,
      singleEvents: true,
      orderBy: "startTime",
      timeMin: (sinceDate || new Date()).toISOString(),
      // Look a reasonable window ahead too -- an event's description
      // can contain a commitment ("bring the signed NDA") worth
      // extracting before the event even happens, not just after.
      timeMax: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

    const items = (response.data.items || [])
      .filter((event) => event.status !== "cancelled")
      .map(normalizeEvent);

    return {
      items,
      nextCursor: response.data.nextPageToken || null,
    };
  },

  async revokeToken(accessToken) {
    const client = buildOAuthClient();
    await client.revokeToken(accessToken);
  },
};

function normalizeEvent(event) {
  const start = event.start?.dateTime || event.start?.date;
  const description = event.description || "";
  const attendees = (event.attendees || []).map((a) => a.email).join(", ");

  const fullText = [
    `Event: ${event.summary || "(untitled event)"}`,
    attendees ? `Attendees: ${attendees}` : "",
    description,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    externalId: event.id,
    title: event.summary || "(untitled event)",
    previewText: description.slice(0, 500) || event.summary || "",
    fullText,
    url: event.htmlLink,
    occurredAt: new Date(start),
  };
}

export default assertValidConnector(calendarConnector, "calendar");