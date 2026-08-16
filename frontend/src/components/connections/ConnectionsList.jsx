import React from "react";
import { ShieldCheck } from "lucide-react";
import ConnectionCard from "./ConnectionCard";

// ----------------------------------------------------------------------
// Memora — ConnectionsList
// Splits connections into "Connected" and "Available" sections and
// renders a ConnectionCard for each. Purely presentational; ConnectionsPage
// owns the actual data fetching and OAuth trigger logic.
//
// Props:
//   connected: Connection[]     — has `account` set
//   available: Connection[]     — has `desc` set, no `account`
//   connectingId?: string       — id currently mid-OAuth-flow
//   onConnect(id): void
//   onSyncNow(id): void
//   onDisconnect(id): void
// ----------------------------------------------------------------------

export default function ConnectionsList({
  connected = [],
  available = [],
  connectingId = null,
  onConnect,
  onSyncNow,
  onDisconnect,
}) {
  return (
    <>
      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-[#8A8FA3]">
          Connected — {connected.length}
        </h2>
        {connected.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 px-5 py-8 text-center">
            <p className="text-sm text-[#8A8FA3]">
              Nothing connected yet. Add one below to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {connected.map((c) => (
              <ConnectionCard
                key={c.id}
                connection={c}
                onSyncNow={onSyncNow}
                onDisconnect={onDisconnect}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mt-9">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-[#8A8FA3]">
          Available
        </h2>
        <div className="space-y-3">
          {available.map((c) => (
            <ConnectionCard
              key={c.id}
              connection={c}
              onConnect={onConnect}
              isConnecting={connectingId === c.id}
            />
          ))}
        </div>
      </section>

      <div className="mt-9 flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-[#171B2E] p-5">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#5EC8B8]" strokeWidth={1.75} />
        <p className="text-xs leading-relaxed text-[#8A8FA3]">
          Memora only reads what's needed to track commitments — it never posts, sends,
          or deletes anything on your behalf. Disconnecting an account erases everything
          indexed from it within 24 hours.
        </p>
      </div>
    </>
  );
}