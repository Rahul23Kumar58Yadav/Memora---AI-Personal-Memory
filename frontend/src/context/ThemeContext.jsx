import React, { createContext, useEffect, useState } from "react";

// ----------------------------------------------------------------------
// Memora — ThemeContext
// Memora is designed dark-first (see the ink/brass palette across every
// component), so "dark" is the default and the only fully-designed mode
// today. This context exists so a future light mode is a config change,
// not a rewrite — it toggles a `data-theme` attribute on <html> that
// components can key off of later.
// ----------------------------------------------------------------------

export const ThemeContext = createContext(null);

const STORAGE_KEY = "memora_theme";

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "dark";
    return localStorage.getItem(STORAGE_KEY) || "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  const value = { theme, setTheme, toggleTheme, isDark: theme === "dark" };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}