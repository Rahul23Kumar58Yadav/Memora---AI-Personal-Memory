import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

// ----------------------------------------------------------------------
// Memora — DashboardLayout
// Shared shell for every authenticated page. Renders Sidebar on desktop
// (>= sm) and Navbar's top bar + bottom tabs on mobile. Individual pages
// (DashboardPage, ChatPage, CommitmentsPage, etc.) render via <Outlet />
// and should NOT re-implement their own nav chrome — just page content.
//
// Usage with react-router:
//   <Route element={<DashboardLayout />}>
//     <Route path="/dashboard" element={<DashboardPage />} />
//     <Route path="/chat" element={<ChatPage />} />
//     <Route path="/commitments" element={<CommitmentsPage />} />
//     <Route path="/connections" element={<ConnectionsPage />} />
//     <Route path="/settings" element={<SettingsPage />} />
//   </Route>
// ----------------------------------------------------------------------

export default function DashboardLayout({ user }) {
  return (
    <div className="flex min-h-screen bg-[#0F1220]">
      <Sidebar user={user} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar user={user} />

        {/* Page content — bottom padding on mobile clears the fixed tab bar */}
        <main className="flex-1 pb-20 sm:pb-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}