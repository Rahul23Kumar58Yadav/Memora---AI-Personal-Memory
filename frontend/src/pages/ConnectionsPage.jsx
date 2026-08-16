import React from "react";
import { Mail, Calendar, MessageSquare, FileText, Hash } from "lucide-react";
import ConnectionsList from "../components/connections/ConnectionsList";
import { useConnections } from "../hooks/useConnections";
import { PROVIDERS } from "../utils/constants";

// ----------------------------------------------------------------------
// Memora — ConnectionsPage (refactored)
// Was previously ~180 lines with hardcoded CONNECTED/AVAILABLE arrays
// and inline ConnectedCard/AvailableCard components. Now:
//   - useConnections() owns fetching + connect/sync/disconnect (with
//     optimistic updates) against the real API
//   - <ConnectionsList /> owns the two-section layout + trust footnote
// Icons still need to be attached client-side since the API returns
// data, not components — ICON_MAP below does that mapping once.
// ----------------------------------------------------------------------

const ICON_MAP = {
  [PROVIDERS.GMAIL]: Mail,
  [PROVIDERS.OUTLOOK]: Mail,
  [PROVIDERS.GOOGLE_CALENDAR]: Calendar,
  [PROVIDERS.SLACK]: Hash,
  [PROVIDERS.WHATSAPP]: MessageSquare,
  [PROVIDERS.NOTION]: FileText,
};

function withIcon(connection) {
  return { ...connection, icon: ICON_MAP[connection.id] || FileText };
}

export default function ConnectionsPage() {
  const { connected, available, isLoading, error, connectingId, connect, syncNow, disconnect } =
    useConnections();

  return (
    <div className="min-h-screen bg-[#0F1220] pb-24 sm:pb-10">
      <header className="border-b border-white/[0.06] px-4 pb-5 pt-6 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-['Space_Grotesk'] text-[22px] font-medium text-[#EDEFF5] sm:text-[26px]">
            Connections
          </h1>
          <p className="mt-1 text-sm text-[#8A8FA3]">What Memora can see, and exactly why.</p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pt-6 sm:px-6">
        {error && (
          <p className="mb-4 rounded-lg border border-[#E8637A]/25 bg-[#E8637A]/10 px-3.5 py-2.5 text-sm text-[#E8637A]">
            {error}
          </p>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[92px] animate-pulse rounded-2xl border border-white/[0.06] bg-[#171B2E]" />
            ))}
          </div>
        ) : (
          <ConnectionsList
            connected={connected.map(withIcon)}
            available={available.map(withIcon)}
            connectingId={connectingId}
            onConnect={connect}
            onSyncNow={syncNow}
            onDisconnect={disconnect}
          />
        )}
      </main>
    </div>
  );
}