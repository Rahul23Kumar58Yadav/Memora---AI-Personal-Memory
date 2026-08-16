import axiosClient, { tokenStore } from "./axiosClient";

// ----------------------------------------------------------------------
// Memora — auth.api
// Maps to backend routes: auth.routes.js
// ----------------------------------------------------------------------

export const authApi = {
  /** POST /auth/signup — { name, email, password } */
  async signup({ name, email, password }) {
    const { data } = await axiosClient.post("/auth/signup", { name, email, password });
    tokenStore.setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    return data.user;
  },

  /** POST /auth/login — { email, password } */
  async login({ email, password }) {
    const { data } = await axiosClient.post("/auth/login", { email, password });
    tokenStore.setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    return data.user;
  },

  /** POST /auth/google — { idToken } from Google OAuth client */
  async loginWithGoogle({ idToken }) {
    const { data } = await axiosClient.post("/auth/google", { idToken });
    tokenStore.setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    return data.user;
  },

  /** POST /auth/logout */
  async logout() {
    try {
      await axiosClient.post("/auth/logout", { refreshToken: tokenStore.getRefreshToken() });
    } finally {
      tokenStore.clearTokens();
    }
  },

  /** GET /auth/me — returns the current user from the access token */
  async getCurrentUser() {
    const { data } = await axiosClient.get("/auth/me");
    return data.user;
  },

  /** POST /auth/forgot-password — { email } */
  async forgotPassword({ email }) {
    const { data } = await axiosClient.post("/auth/forgot-password", { email });
    return data;
  },

  /** POST /auth/reset-password — { token, newPassword } */
  async resetPassword({ token, newPassword }) {
    const { data } = await axiosClient.post("/auth/reset-password", { token, newPassword });
    return data;
  },

  isAuthenticated() {
    return Boolean(tokenStore.getAccessToken());
  },
};