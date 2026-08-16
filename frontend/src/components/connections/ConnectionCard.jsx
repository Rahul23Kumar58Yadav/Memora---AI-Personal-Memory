import React, { useState } from "react";
import {
  Check,
  Plus,
  MoreVertical,
  RefreshCw,
  Unlink,
  ShieldCheck,
} from "lucide-react";

// ----------------------------------------------------------------------
// Memora — ConnectionCard
// Single card component covering both states: already connected (shows
// account, scope, last sync, options menu) and available-to-connect
// (shows description + a Connect button). Which one renders is decided
// by whether `connection.account` is present.
//
// Props:
//   connection: {
//     id, name, icon: LucideIcon, accent: hex,
//     account?: string,          // present = connected
//     scope?: string,            // what this connector reads
//     lastSync?: string,
//     status?: "connected" | "syncing",
//     desc?: string,             // shown when not yet connected
//   }
//   onConnect?(id): void
//   onSyncNow?(id): void
//   onDisconnect?(id): void
//   isConnecting?: boolean       // true while OAuth flow is in progress
// ----------------------------------------------------------------------

export default function ConnectionCard({
  connection,
  onConnect,
  onSyncNow,
  onDisconnect,
  isConnecting = false,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const Icon = connection.icon;
  const isConnected = Boolean(connection.account);
  const isSyncing = connection.status === "syncing";

  if (!isConnected) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-white/[0.1] p-5">
        <div className="flex items-center gap-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.04]">
            <Icon className="h-5 w-5 text-[#8A8FA3]" strokeWidth={1.75} />
          </span>
          <div>
            <p className="font-['Space_Grotesk'] text-[15px] font-medium text-[#EDEFF5]">
              {connection.name}
            </p>
            <p className="mt-0.5 text-xs text-[#8A8FA3]">{connection.desc}</p>
          </div>
        </div>
        <button
          onClick={() => onConnect?.(connection.id)}
          disabled={isConnecting}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/[0.1] px-3.5 py-2 text-xs font-medium text-[#EDEFF5] transition-colors hover:border-[#D4A24C]/40 hover:text-[#D4A24C] disabled:opacity-50"
        >
          {isConnecting ? (
            <>
              <RefreshCw className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
              Connecting…
            </>
          ) : (
            <>
              <Plus className="h-3.5 w-3.5" strokeWidth={2} />
              Connect
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl border border-white/[0.06] bg-[#171B2E] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3.5">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${connection.accent}1A` }}
          >
            <Icon className="h-5 w-5" style={{ color: connection.accent }} strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-['Space_Grotesk'] text-[15px] font-medium text-[#EDEFF5]">
                {connection.name}
              </p>
              {isSyncing ? (
                <span className="flex items-center gap-1 rounded-full bg-[#D4A24C]/10 px-2 py-0.5 text-[10px] font-medium text-[#D4A24C]">
                  <RefreshCw className="h-2.5 w-2.5 animate-spin" strokeWidth={2.5} />
                  Syncing
                </span>
              ) : (
                <span className="flex items-center gap-1 rounded-full bg-[#5EC8B8]/10 px-2 py-0.5 text-[10px] font-medium text-[#5EC8B8]">
                  <Check className="h-2.5 w-2.5" strokeWidth={2.5} />
                  Connected
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-xs text-[#8A8FA3]">{connection.account}</p>
          </div>
        </div>

        <div className="relative shrink-0">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#8A8FA3] transition-colors hover:bg-white/[0.06] hover:text-[#EDEFF5]"
            aria-label="Options"
          >
            <MoreVertical className="h-4 w-4" strokeWidth={1.75} />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-9 z-20 w-44 overflow-hidden rounded-xl border border-white/10 bg-[#1F2440] shadow-xl">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onSyncNow?.(connection.id);
                  }}
                  className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[13px] text-[#EDEFF5] hover:bg-white/[0.05]"
                >
                  <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Sync now
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onDisconnect?.(connection.id);
                  }}
                  className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[13px] text-[#E8637A] hover:bg-white/[0.05]"
                >
                  <Unlink className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Disconnect
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {connection.scope && (
        <p className="mt-3.5 flex items-start gap-1.5 text-xs leading-relaxed text-[#8A8FA3]">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
          {connection.scope}
        </p>
      )}

      {connection.lastSync && (
        <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-3">
          <span className="font-['IBM_Plex_Mono'] text-[11px] text-[#8A8FA3]">
            Last synced {connection.lastSync}
          </span>
        </div>
      )}
    </div>
  );
}