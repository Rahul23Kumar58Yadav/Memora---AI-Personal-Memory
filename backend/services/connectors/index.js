import gmail from "./gmail.service.js";
import calendar from "./googleCalendar.service.js";
import slack from "./slack.service.js";
import notion from "./notion.service.js";

// ----------------------------------------------------------------------
// Memora Backend -- services/connectors/index.js
// Registry mapping a provider id (as used in ConnectedAccount.provider,
// URL params, and the frontend's PROVIDERS constant) to its connector
// implementation. connections.controller.js and jobs/syncInbox.job.js
// both go through getConnector() rather than importing a specific
// provider file directly -- adding a new source later means adding one
// file here, not touching either of those.
//
// NOTE: "outlook" and "whatsapp" appear in the frontend's PROVIDERS
// constant and ConnectedAccount's provider enum, but have no connector
// implementation yet -- getConnector() returns undefined for them today,
// which connections.controller.js already handles with a 400. Add
// outlook.service.js / whatsapp.service.js here when those are built.
// ----------------------------------------------------------------------

const registry = {
  gmail,
  calendar,
  slack,
  notion,
};

/**
 * @param {string} provider
 * @returns {import('./connectorBase.js').Connector | undefined}
 */
export function getConnector(provider) {
  return registry[provider];
}

export function listSupportedProviders() {
  return Object.keys(registry);
}

export default { getConnector, listSupportedProviders };