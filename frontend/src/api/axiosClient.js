import axios from "axios";

// ----------------------------------------------------------------------
// Memora — axiosClient
// Single shared axios instance. Attaches the access token to every
// request, and on a 401 transparently tries a refresh once before
// falling back to logging the user out. All other api/*.js files import
// this instance instead of calling axios directly.
// ----------------------------------------------------------------------

const BASE_URL = import.meta.env?.VITE_API_URL || "http://localhost:5000/api";

const axiosClient = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
});

// ---- token storage helpers -------------------------------------------
// Kept in one place so swapping storage strategy (memory vs cookie vs
// localStorage) later only touches this file.
export const tokenStore = {
  getAccessToken: () => localStorage.getItem("memora_access_token"),
  getRefreshToken: () => localStorage.getItem("memora_refresh_token"),
  setTokens: ({ accessToken, refreshToken }) => {
    if (accessToken) localStorage.setItem("memora_access_token", accessToken);
    if (refreshToken) localStorage.setItem("memora_refresh_token", refreshToken);
  },
  clearTokens: () => {
    localStorage.removeItem("memora_access_token");
    localStorage.removeItem("memora_refresh_token");
  },
};

// ---- request interceptor: attach access token -------------------------
axiosClient.interceptors.request.use(
  (config) => {
    const token = tokenStore.getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ---- response interceptor: transparent refresh on 401 ------------------
let isRefreshing = false;
let pendingQueue = [];

function resolvePendingQueue(error, token = null) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  pendingQueue = [];
}

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    // Don't try to refresh on the refresh call itself, or if already retried
    if (status !== 401 || originalRequest._retry || originalRequest.url?.includes("/auth/refresh")) {
      return Promise.reject(normalizeError(error));
    }

    if (isRefreshing) {
      // queue this request until the in-flight refresh resolves
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      })
        .then((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return axiosClient(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = tokenStore.getRefreshToken();
      if (!refreshToken) throw new Error("No refresh token available");

      const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
      tokenStore.setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });

      resolvePendingQueue(null, data.accessToken);
      originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
      return axiosClient(originalRequest);
    } catch (refreshError) {
      resolvePendingQueue(refreshError, null);
      tokenStore.clearTokens();
      // TODO: hook into your router/AuthContext to force a redirect to /login
      window.dispatchEvent(new CustomEvent("memora:logout"));
      return Promise.reject(normalizeError(refreshError));
    } finally {
      isRefreshing = false;
    }
  }
);

// ---- consistent error shape for callers --------------------------------
function normalizeError(error) {
  const message =
    error.response?.data?.message ||
    error.response?.data?.error ||
    error.message ||
    "Something went wrong. Please try again.";
  return { message, status: error.response?.status, raw: error };
}

export default axiosClient;