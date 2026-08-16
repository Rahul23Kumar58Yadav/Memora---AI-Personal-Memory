import axiosClient from "./axiosClient";

// ----------------------------------------------------------------------
// Memora — chat.api
// Maps to backend routes: chat.routes.js
// Passive recall — RAG query over the user's connected data.
// ----------------------------------------------------------------------

export const chatApi = {
  /**
   * POST /chat/query — { query, sessionId? }
   * Returns { text, sources: [{ id, type, label, meta, refId }] }
   */
  async ask({ query, sessionId } = {}) {
    const { data } = await axiosClient.post("/chat/query", { query, sessionId });
    return data;
  },

  /** GET /chat/sessions — list past conversations */
  async listSessions() {
    const { data } = await axiosClient.get("/chat/sessions");
    return data.sessions;
  },

  /** GET /chat/sessions/:id — full message history for one session */
  async getSession(sessionId) {
    const { data } = await axiosClient.get(`/chat/sessions/${sessionId}`);
    return data.session;
  },

  /** DELETE /chat/sessions/:id */
  async deleteSession(sessionId) {
    const { data } = await axiosClient.delete(`/chat/sessions/${sessionId}`);
    return data;
  },
};