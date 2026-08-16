import React from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import ProtectedRoute from "./ProtectedRoute";
import DashboardLayout from "../components/layout/DashboardLayout";
import { ROUTES } from "../utils/constants";

// Public pages
import LandingPage from "../pages/LandingPage";
import LoginPage from "../pages/LoginPage";
import SignupPage from "../pages/SignupPage";
import NotFoundPage from "../pages/NotFoundPage";

// Authenticated pages
import DashboardPage from "../pages/DashboardPage";
import ChatPage from "../pages/ChatPage";
import CommitmentsPage from "../pages/CommitmentsPage";
import ConnectionsPage from "../pages/ConnectionsPage";
import SettingsPage from "../pages/SettingsPage";

// Connections OAuth redirect target
import OAuthCallback from "../components/connections/OAuthCallback";

// ----------------------------------------------------------------------
// Memora — AppRoutes
// Full route tree. Three groups:
//   1. Public — landing, login, signup. Login/signup redirect an already
//      authenticated user straight to the dashboard instead of showing
//      the form again.
//   2. Protected — everything behind ProtectedRoute, wrapped once in
//      DashboardLayout so Sidebar/Navbar render exactly once per group,
//      not per page.
//   3. Catch-all 404.
//
// Mount this at the app root:
//   // App.jsx
//   import AppRoutes from "./routes/AppRoutes";
//   export default function App() { return <AppRoutes />; }
// ----------------------------------------------------------------------

/**
 * Prevents a logged-in user from landing back on /login or /signup —
 * e.g. hitting back-button after signing in, or a stale bookmark.
 */
function RedirectIfAuthenticated() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null; // avoid a flash-redirect before bootstrap resolves
  if (isAuthenticated) return <Navigate to={ROUTES.DASHBOARD} replace />;
  return <Outlet />;
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ---- Fully public ---- */}
        <Route path={ROUTES.HOME} element={<LandingPage />} />

        {/* ---- Public, but redirect away if already logged in ---- */}
        <Route element={<RedirectIfAuthenticated />}>
          <Route path={ROUTES.LOGIN} element={<LoginPage />} />
          <Route path={ROUTES.SIGNUP} element={<SignupPage />} />
        </Route>

        {/* ---- OAuth redirect target — reachable whether or not the
               session is fully hydrated yet, so it's outside the guard ---- */}
        <Route path="/connections/:provider/callback" element={<OAuthCallback />} />

        {/* ---- Protected app shell ---- */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
            <Route path={ROUTES.CHAT} element={<ChatPage />} />
            <Route path={ROUTES.COMMITMENTS} element={<CommitmentsPage />} />
            <Route path={ROUTES.CONNECTIONS} element={<ConnectionsPage />} />
            <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
          </Route>
        </Route>

        {/* ---- 404 ---- */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}