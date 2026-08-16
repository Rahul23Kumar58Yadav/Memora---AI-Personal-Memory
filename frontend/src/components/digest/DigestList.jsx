import React, { useMemo } from "react";
import { Inbox } from "lucide-react";
import DigestCard from "./DigestCard";

// ----------------------------------------------------------------------
// Memora — DigestList
// History of delivered digests, grouped by month, most recent first.
// The most recent digest opens expanded by default so the page doesn't
// feel empty on first load.
//
// Props:
//   digests: Digest[]     — see DigestCard for shape; expects a `month`
//                            field (e.g. "August 2026") on each item
//   loading?: boolean
// ----------------------------------------------------------------------

function DigestSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-[70px] animate-pulse rounded-2xl border border-white/[0.06] bg-[#171B2E]" />
      ))}
    </div>
  );
}

export default function DigestList({ digests = [], loading = false }) {
  const grouped = useMemo(() => {
    const map = {};
    digests.forEach((d) => {
      if (!map[d.month]) map[d.month] = [];
      map[d.month].push(d);
    });
    return Object.entries(map).map(([month, items]) => ({ month, items }));
  }, [digests]);

  if (loading) return <DigestSkeleton />;

  if (digests.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center">
        <Inbox className="h-6 w-6 text-[#8A8FA3]" strokeWidth={1.5} />
        <p className="mt-3 text-sm text-[#8A8FA3]">
          No digests yet. Your first one lands after your daily send time.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {grouped.map(({ month, items }, groupIdx) => (
        <section key={month}>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-[#8A8FA3]">
            {month}
          </h2>
          <div className="space-y-3">
            {items.map((digest, i) => (
              <DigestCard key={digest.id} digest={digest} defaultOpen={groupIdx === 0 && i === 0} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}