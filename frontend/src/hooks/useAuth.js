import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

// ----------------------------------------------------------------------
// Memora — useAuth
// Thin accessor for AuthContext. Throws early if used outside the
// provider so misuse fails loudly during development instead of
// silently returning undefined.
// ----------------------------------------------------------------------

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }
  return ctx;
}