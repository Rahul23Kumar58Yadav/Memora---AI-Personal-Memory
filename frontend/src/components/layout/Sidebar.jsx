import React from "react";
import { NavLink } from "react-router-dom";
import {
  Flame,
  MessageSquare,
  ListChecks,
  Plug,
  Settings,
  LogOut,
} from "lucide-react";

// ----------------------------------------------------------------------
// Memora — Sidebar
// Desktop-only nav rail. The active link picks up a knot marker on its
// left edge — a small continuation of the memory-thread motif rather
// than a generic highlight pill.
// ----------------------------------------------------------------------

const NAV_ITEMS = [
  { to: "/dashboard", label: "Thread", icon: Flame },
  { to: "/chat", label: "Ask Memora", icon: MessageSquare },
  { to: "/commitments", label: "Commitments", icon: ListChecks },
  { to: "/connections", label: "Connections", icon: Plug },
];

export default function Sidebar({ user = { name: "Aarav Sharma", email: "aarav@gmail.com" } }) {
  return (
    <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-white/[0.06] bg-[#0F1220] sm:flex">
      {/* Brand */}
      <div className="flex items-center gap-2 px-6 py-6">
        <span className="font-['Space_Grotesk'] text-[18px] font-medium text-[#EDEFF5]">
          Memora
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[14px] transition-colors ${
                isActive
                  ? "bg-white/[0.06] text-[#EDEFF5]"
                  : "text-[#8A8FA3] hover:bg-white/[0.03] hover:text-[#EDEFF5]"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`absolute -left-3 h-4 w-[3px] rounded-full transition-colors ${
                    isActive ? "bg-[#D4A24C]" : "bg-transparent"
                  }`}
                />
                <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom: settings + profile */}
      <div className="space-y-1 border-t border-white/[0.06] px-3 py-4">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[14px] transition-colors ${
              isActive ? "bg-white/[0.06] text-[#EDEFF5]" : "text-[#8A8FA3] hover:bg-white/[0.03] hover:text-[#EDEFF5]"
            }`
          }
        >
          <Settings className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
          Settings
        </NavLink>

        <div className="mt-3 flex items-center gap-3 rounded-xl px-3.5 py-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#D4A24C]/15 font-['Space_Grotesk'] text-xs font-medium text-[#D4A24C]">
            {user.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] text-[#EDEFF5]">{user.name}</p>
            <p className="truncate text-[11px] text-[#8A8FA3]">{user.email}</p>
          </div>
          <button
            className="shrink-0 text-[#8A8FA3] transition-colors hover:text-[#E8637A]"
            aria-label="Log out"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </aside>
  );
}