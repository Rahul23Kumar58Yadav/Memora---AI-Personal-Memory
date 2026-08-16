import axiosClient from "./axiosClient";

// ----------------------------------------------------------------------
// Memora — commitments.api
// Maps to backend routes: commitments.routes.js
// ----------------------------------------------------------------------

export const commitmentsApi = {
  /**
   * GET /commitments — list, with optional filters
   * params: { status: "overdue"|"today"|"upcoming"|"stale"|"kept"|"all", q, limit, cursor }
   */
  async list(params = {}) {
    const { data } = await axiosClient.get("/commitments", { params });
    return data; // { items, nextCursor }
  },

  /** GET /commitments/:id */
  async getById(id) {
    const { data } = await axiosClient.get(`/commitments/${id}`);
    return data.commitment;
  },

  /** GET /commitments/summary — counts for dashboard stat cards */
  async getSummary() {
    const { data } = await axiosClient.get("/commitments/summary");
    return data; // { overdue, today, upcoming, keptThisMonth }
  },

  /** PATCH /commitments/:id/keep — mark as kept */
  async markKept(id) {
    const { data } = await axiosClient.patch(`/commitments/${id}/keep`);
    return data.commitment;
  },

  /** PATCH /commitments/:id/snooze — { dueDate } */
  async snooze(id, dueDate) {
    const { data } = await axiosClient.patch(`/commitments/${id}/snooze`, { dueDate });
    return data.commitment;
  },

  /**
   * PATCH /commitments/:id/dismiss
   * User correction: "this wasn't actually a commitment" — feeds back
   * into extraction accuracy on the backend.
   */
  async dismiss(id, reason) {
    const { data } = await axiosClient.patch(`/commitments/${id}/dismiss`, { reason });
    return data;
  },

  /** PATCH /commitments/:id — general edit (text, due date, etc.) */
  async update(id, updates) {
    const { data } = await axiosClient.patch(`/commitments/${id}`, updates);
    return data.commitment;
  },

  /** DELETE /commitments/:id */
  async remove(id) {
    const { data } = await axiosClient.delete(`/commitments/${id}`);
    return data;
  },
};