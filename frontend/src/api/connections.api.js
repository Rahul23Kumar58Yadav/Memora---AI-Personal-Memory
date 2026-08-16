import axiosClient from "./axiosClient";

// ----------------------------------------------------------------------
// Memora — connections.api
// Maps to backend routes: connections.routes.js
// Handles connecting/disconnecting Gmail, Calendar, Slack, etc.
// ----------------------------------------------------------------------

export const connectionsApi = {
  /** GET /connections — list of connected + available integrations */
  async list() {
    const { data } = await axiosClient.get("/connections");
    return data.connections;
  },

  /**
   * GET /connections/:provider/auth-url
   * Returns the OAuth URL to redirect the user to (Gmail, Slack, etc.)
   * Usage: window.location.href = await connectionsApi.getAuthUrl("gmail")
   */
  async getAuthUrl(provider) {
    const { data } = await axiosClient.get(`/connections/${provider}/auth-url`);
    return data.url;
  },

  /**
   * POST /connections/:provider/callback
   * Called from the OAuth redirect page with the code/state params.
   */
  async completeOAuth(provider, { code, state }) {
    const { data } = await axiosClient.post(`/connections/${provider}/callback`, { code, state });
    return data.connection;
  },

  /** POST /connections/:id/sync — trigger an immediate manual sync */
  async syncNow(connectionId) {
    const { data } = await axiosClient.post(`/connections/${connectionId}/sync`);
    return data.connection;
  },

  /** DELETE /connections/:id — disconnect an account */
  async disconnect(connectionId) {
    const { data } = await axiosClient.delete(`/connections/${connectionId}`);
    return data;
  },
};