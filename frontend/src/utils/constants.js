// ----------------------------------------------------------------------
// Memora — constants.js
// Single source of truth for values used across multiple components:
// urgency styling, source metadata, routes, and API config. Import from
// here instead of re-declaring URGENCY_STYLES / SOURCE_ICON per-file.
// ----------------------------------------------------------------------

// ---- Commitment urgency states ------------------------------------------
export const URGENCY = {
  OVERDUE: "overdue",
  TODAY: "today",
  UPCOMING: "upcoming",
  STALE: "stale",
  KEPT: "kept",
};

// Color tokens — keep in sync with the palette used across components.
// Import these instead of hardcoding hex values in new components.
export const COLORS = {
  ink: "#0F1220",
  surface: "#171B2E",
  surfaceElevated: "#1F2440",
  textPrimary: "#EDEFF5",
  textMuted: "#8A8FA3",
  brass: "#D4A24C", // primary accent — "today" / brand actions
  teal: "#5EC8B8", // "upcoming" / "kept" / success
  rose: "#E8637A", // "overdue" / destructive
};

export const URGENCY_COLOR = {
  [URGENCY.OVERDUE]: COLORS.rose,
  [URGENCY.TODAY]: COLORS.brass,
  [URGENCY.UPCOMING]: COLORS.teal,
  [URGENCY.STALE]: COLORS.textMuted,
  [URGENCY.KEPT]: COLORS.teal,
};

export const URGENCY_LABEL = {
  [URGENCY.OVERDUE]: "Overdue",
  [URGENCY.TODAY]: "Due today",
  [URGENCY.UPCOMING]: "Upcoming",
  [URGENCY.STALE]: "Fading",
  [URGENCY.KEPT]: "Kept",
};

// Group labels used by CommitmentList's default ordering
export const COMMITMENT_GROUP_ORDER = ["Overdue", "Today", "This week", "Fading", "Kept"];

// ---- Connected data sources ----------------------------------------------
export const SOURCE_TYPE = {
  EMAIL: "email",
  CALENDAR: "calendar",
  CHAT: "chat",
  DOC: "doc",
};

export const SOURCE_LABEL = {
  [SOURCE_TYPE.EMAIL]: "Email",
  [SOURCE_TYPE.CALENDAR]: "Calendar",
  [SOURCE_TYPE.CHAT]: "Chat",
  [SOURCE_TYPE.DOC]: "Document",
};

// ---- Connection providers -------------------------------------------------
export const PROVIDERS = {
  GMAIL: "gmail",
  OUTLOOK: "outlook",
  GOOGLE_CALENDAR: "calendar",
  SLACK: "slack",
  WHATSAPP: "whatsapp",
  NOTION: "notion",
};

// ---- Routes ---------------------------------------------------------------
// Central route strings so nav components and redirects never drift.
export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  SIGNUP: "/signup",
  FORGOT_PASSWORD: "/forgot-password",
  DASHBOARD: "/dashboard",
  CHAT: "/chat",
  COMMITMENTS: "/commitments",
  CONNECTIONS: "/connections",
  OAUTH_CALLBACK: (provider) => `/connections/${provider}/callback`,
  SETTINGS: "/settings",
  DIGEST: "/digest",
  TERMS: "/terms",
  PRIVACY: "/privacy",
};

// ---- Digest / notification channels ---------------------------------------
export const DIGEST_CHANNEL = {
  EMAIL: "email",
  PUSH: "push",
  BOTH: "both",
};

// ---- API / app config -------------------------------------------------------
export const APP_NAME = "Memora";

export const API_CONFIG = {
  BASE_URL: import.meta.env?.VITE_API_URL || "http://localhost:5000/api",
  TIMEOUT_MS: 20000,
};

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
};

// ---- Misc UI --------------------------------------------------------------
export const TOAST_DURATION_MS = 4000;
export const DEBOUNCE_SEARCH_MS = 300;