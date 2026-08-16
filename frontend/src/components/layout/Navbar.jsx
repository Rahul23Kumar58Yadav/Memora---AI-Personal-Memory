import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  Flame,
  MessageSquare,
  ListChecks,
  Plug,
  Search,
  Menu,
  X,
  Settings,
  LogOut,
} from "lucide-react";

// ----------------------------------------------------------------------
// Memora — Navbar
// Mobile-only shell: a slim sticky top bar (brand + search + menu) plus
// a bottom tab bar for the four primary destinations. Desktop relies on
// Sidebar.jsx instead — DashboardLayout swaps between them by breakpoint.
// ----------------------------------------------------------------------

const TAB_ITEMS = [
  { to: "/dashboard", label: "Thread", icon: Flame },
  { to: "/chat", label: "Ask", icon: MessageSquare },
  { to: "/commitments", label: "Commitments", icon: ListChecks },
  { to: "/connections", label: "Connect", icon: Plug },
];

export default function Navbar({ user = { name: "Aarav Sharma", email: "aarav@gmail.com" } }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/[0.06] bg-[#0F1220]/90 px-4 py-3.5 backdrop-blur-md sm:hidden">
        <span className="font-['Space_Grotesk'] text-[17px] font-medium text-[#EDEFF5]">
          Memora
        </span>
        <div className="flex items-center gap-1">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#8A8FA3] transition-colors hover:bg-white/[0.06] hover:text-[#EDEFF5]"
            aria-label="Search"
          >
            <Search className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </button>
          <button
            onClick={() => setMenuOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#8A8FA3] transition-colors hover:bg-white/[0.06] hover:text-[#EDEFF5]"
            aria-label="Menu"
          >
            <Menu className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </button>
        </div>
      </header>

      {/* Slide-over menu (profile + settings + logout) */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 sm:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-72 border-l border-white/[0.08] bg-[#0F1220] p-5">
            <div className="flex items-center justify-between">
              <span className="font-['Space_Grotesk'] text-[16px] font-medium text-[#EDEFF5]">
                Menu
              </span>
              <button onClick={() => setMenuOpen(false)} className="text-[#8A8FA3]" aria-label="Close">
                <X className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </div>

            <div className="mt-6 flex items-center gap-3 rounded-xl border border-white/[0.06] bg-[#171B2E] p-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#D4A24C]/15 font-['Space_Grotesk'] text-xs font-medium text-[#D4A24C]">
                {user.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13px] text-[#EDEFF5]">{user.name}</p>
                <p className="truncate text-[11px] text-[#8A8FA3]">{user.email}</p>
              </div>
            </div>

            <nav className="mt-5 space-y-1">
              <NavLink
                to="/settings"
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[14px] ${
                    isActive ? "bg-white/[0.06] text-[#EDEFF5]" : "text-[#8A8FA3]"
                  }`
                }
              >
                <Settings className="h-[18px] w-[18px]" strokeWidth={1.75} />
                Settings
              </NavLink>
              <button className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-[14px] text-[#E8637A]">
                <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} />
                Log out
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.06] bg-[#0F1220]/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] sm:hidden">
        <div className="flex items-center justify-around px-1 py-2">
          {TAB_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 rounded-lg px-3 py-1.5 ${
                  isActive ? "text-[#D4A24C]" : "text-[#8A8FA3]"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="h-5 w-5" strokeWidth={isActive ? 2 : 1.75} />
                  <span className="text-[10px] font-medium">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}