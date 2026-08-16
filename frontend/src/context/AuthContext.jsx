import React, { createContext, useCallback, useEffect, useState } from "react";
import { authApi } from "../api/auth.api";
import { tokenStore } from "../api/axiosClient";

// ----------------------------------------------------------------------
// Memora — AuthContext
// Single source of truth for the current user. Bootstraps from a stored
// token on mount, and listens for the "memora:logout" event dispatched
// by axiosClient when a refresh fails, so an expired session anywhere
// in the app funnels back to one logout path.
// ----------------------------------------------------------------------

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const bootstrap = useCallback(async () => {
    if (!tokenStore.getAccessToken()) {
      setIsLoading(false);
      return;
    }
    try {
      const me = await authApi.getCurrentUser();
      setUser(me);
    } catch {
      tokenStore.clearTokens();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  // axiosClient fires this when a token refresh fails
  useEffect(() => {
    const handleForcedLogout = () => setUser(null);
    window.addEventListener("memora:logout", handleForcedLogout);
    return () => window.removeEventListener("memora:logout", handleForcedLogout);
  }, []);

  const login = useCallback(async (credentials) => {
    setError("");
    try {
      const loggedInUser = await authApi.login(credentials);
      setUser(loggedInUser);
      return loggedInUser;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const signup = useCallback(async (details) => {
    setError("");
    try {
      const newUser = await authApi.signup(details);
      setUser(newUser);
      return newUser;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const loginWithGoogle = useCallback(async (idToken) => {
    setError("");
    try {
      const loggedInUser = await authApi.loginWithGoogle({ idToken });
      setUser(loggedInUser);
      return loggedInUser;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  const value = {
    user,
    isAuthenticated: Boolean(user),
    isLoading,
    error,
    login,
    signup,
    loginWithGoogle,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}