import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { ROUTES } from "../utils/constants";

// ----------------------------------------------------------------------
// Memora — ProtectedRoute
// Gates authenticated-only routes. Three states:
//   1. Still bootstrapping (checking stored token) → show a loader,
//      NOT a redirect — redirecting before we know the auth state would
//      bounce a logged-in user on every hard refresh.
//   2. Not authenticated → redirect to /login, preserving where they
//      were headed via location state so login can send them back.
//   3. Authenticated → render the nested route via <Outlet />.
//
// Usage in AppRoutes.jsx:
//   <Route element={<ProtectedRoute />}>
//     <Route element={<DashboardLayout />}>
//       <Route path="/dashboard" element={<DashboardPage />} />
//       ...
//     </Route>
//   </Route>
// ----------------------------------------------------------------------

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0F1220]">
      <Loader2 className="h-6 w-6 animate-spin text-[#D4A24C]" strokeWidth={1.75} />
    </div>
  );
}

export default function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <FullScreenLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace state={{ from: location }} />;
  }

  return <Outlet />;
}