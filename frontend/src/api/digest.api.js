import axiosClient from "./axiosClient";

// ----------------------------------------------------------------------
// Memora — digest.api
// Maps to backend routes: digest.routes.js
// ----------------------------------------------------------------------

export const digestApi = {
  /**
   * GET /digest — history of delivered digests
   * params: { limit, cursor }
   */
  async list(params = {}) {
    const { data } = await axiosClient.get("/digest", { params });
    return data; // { digests, nextCursor }
  },

  /** GET /digest/latest — today's/most recent digest */
  async getLatest() {
    const { data } = await axiosClient.get("/digest/latest");
    return data.digest;
  },

  /** GET /digest/:id */
  async getById(id) {
    const { data } = await axiosClient.get(`/digest/${id}`);
    return data.digest;
  },

  /** GET /digest/settings — current preferences */
  async getSettings() {
    const { data } = await axiosClient.get("/digest/settings");
    return data.settings; // { enabled, time, channel, staleReminders }
  },

  /** PATCH /digest/settings — { enabled, time, channel, staleReminders } */
  async updateSettings(settings) {
    const { data } = await axiosClient.patch("/digest/settings", settings);
    return data.settings;
  },

  /** POST /digest/send-now — trigger an immediate digest generation (testing/manual) */
  async sendNow() {
    const { data } = await axiosClient.post("/digest/send-now");
    return data.digest;
  },
};