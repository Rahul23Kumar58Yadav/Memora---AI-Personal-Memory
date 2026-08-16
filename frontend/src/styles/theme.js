// ----------------------------------------------------------------------
// Memora — theme.js
// JS-side mirror of the CSS variables in globals.css. Use this wherever
// a color/font value needs to be a JS value rather than a Tailwind class
// — chart libraries (recharts/chart.js), canvas, inline styles, or
// tailwind.config.js itself. Keep both files in sync if a token changes.
// ----------------------------------------------------------------------

export const theme = {
  colors: {
    ink: "#0F1220",
    surface: "#171B2E",
    surfaceElevated: "#1F2440",

    textPrimary: "#EDEFF5",
    textMuted: "#8A8FA3",

    brass: "#D4A24C", // primary accent — brand, "today", CTAs
    teal: "#5EC8B8", // "upcoming" / "kept" / success
    rose: "#E8637A", // "overdue" / destructive

    border: "rgba(255, 255, 255, 0.06)",
    borderStrong: "rgba(255, 255, 255, 0.12)",
  },

  fonts: {
    display: "'Space Grotesk', sans-serif",
    body: "'Inter', sans-serif",
    mono: "'IBM Plex Mono', monospace",
  },

  radii: {
    md: "0.75rem", // 12px — inputs, chips
    lg: "1rem", // 16px — cards
    xl: "1.25rem", // 20px — panels, sections
    full: "9999px", // pills, buttons, avatars
  },

  // Standard easing/duration for hover + entrance transitions, so every
  // component's `transition-*` classes settle on the same feel.
  motion: {
    fast: "150ms ease-out",
    base: "200ms ease-out",
    slow: "320ms ease-out",
  },

  breakpoints: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
  },
};

// ---- Urgency → color mapping ---------------------------------------------
// Same semantics as utils/constants.js's URGENCY_COLOR — duplicated here
// deliberately so chart/canvas code can import theme.js alone without
// pulling in domain constants.
export const urgencyColor = {
  overdue: theme.colors.rose,
  today: theme.colors.brass,
  upcoming: theme.colors.teal,
  stale: theme.colors.textMuted,
  kept: theme.colors.teal,
};

// ---- Chart palette ---------------------------------------------------------
// For any recharts/chart.js usage (e.g. a future "commitments kept over
// time" graph) — an ordered, colorblind-considerate sequence built from
// the existing accent set rather than introducing new hues.
export const chartPalette = [
  theme.colors.brass,
  theme.colors.teal,
  theme.colors.rose,
  "#7C8CD8", // muted periwinkle — supplementary series only, not used elsewhere in the UI
  theme.colors.textMuted,
];

/**
 * Helper for inline styles when a Tailwind arbitrary class isn't
 * practical (e.g. dynamic chart colors, SVG fills computed at runtime).
 *   style={{ backgroundColor: withAlpha(theme.colors.brass, 0.1) }}
 */
export function withAlpha(hex, alpha) {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.substring(0, 2), 16);
  const g = parseInt(normalized.substring(2, 4), 16);
  const b = parseInt(normalized.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default theme;