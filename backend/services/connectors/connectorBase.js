// ----------------------------------------------------------------------
// Memora Backend -- connectorBase.js
// Every provider (Gmail, Calendar, Slack, Notion) implements this same
// shape, so connections.controller.js and syncInbox.job.js can treat
// them interchangeably via services/connectors/index.js's getConnector().
// This is what makes MCP-style "one more source" additions a matter of
// adding a new file, not touching the controller or job logic.
//
// This file exports JSDoc typedefs + a validation helper, not a class
// to extend -- each connector is a plain object literal implementing
// the shape below, which keeps them simple to read independently.
// ----------------------------------------------------------------------

/**
 * @typedef {object} TokenExchangeResult
 * @property {string} accessToken
 * @property {string} [refreshToken] - not all providers issue one on every exchange
 * @property {Date} [expiresAt]
 * @property {string} accountLabel - human-readable identifier (email, workspace name)
 * @property {string[]} scopes
 */

/**
 * @typedef {object} NormalizedItem
 * @property {string} externalId - provider's own id for this item (message id, event id, etc.)
 * @property {string} title
 * @property {string} previewText - short preview, NOT the full body (see Document.js)
 * @property {string} fullText - full body, used transiently for chunking/extraction then discarded
 * @property {string} [url] - deep link back to the source
 * @property {Date} occurredAt
 */

/**
 * @typedef {object} Connector
 * @property {(state: string) => string} getAuthUrl
 * @property {(code: string) => Promise<TokenExchangeResult>} exchangeCode
 * @property {(refreshToken: string) => Promise<TokenExchangeResult>} refreshAccessToken
 * @property {(account: import('mongoose').Document, options?: {cursor?: string, sinceDate?: Date}) => Promise<{items: NormalizedItem[], nextCursor: string|null}>} fetchRecentItems
 * @property {(accessToken: string) => Promise<void>} [revokeToken] - best-effort, optional
 */

const REQUIRED_METHODS = ["getAuthUrl", "exchangeCode", "refreshAccessToken", "fetchRecentItems"];

/**
 * Throws a clear error at registration time (services/connectors/index.js)
 * if a connector is missing a required method -- fails loudly at boot
 * rather than with a cryptic "x is not a function" deep in a sync job.
 */
export function assertValidConnector(connector, name) {
  for (const method of REQUIRED_METHODS) {
    if (typeof connector[method] !== "function") {
      throw new Error(`Connector "${name}" is missing required method: ${method}()`);
    }
  }
  return connector;
}