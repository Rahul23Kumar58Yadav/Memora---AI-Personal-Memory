import React, { useState } from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";
import CommitmentList from "../components/commitments/CommitmentList";
import CommitmentDetail from "../components/commitments/CommitmentDetail";
import { useCommitments } from "../hooks/useCommitments";
import { isSearchableQuery } from "../utils/validators";

// ----------------------------------------------------------------------
// Memora — CommitmentsPage (refactored)
// Was previously ~180 lines with mock data, inline grouping logic, and
// an inline CommitmentRow. Now:
//   - useCommitments() owns fetching, filtering-by-status, and the
//     keep/snooze/dismiss mutations (with optimistic rollback)
//   - <CommitmentList /> owns grouping + rendering
//   - <CommitmentDetail /> owns the slide-over panel
// This file is left with only page-level concerns: search input, filter
// tabs, and wiring the selected-item state for the detail panel.
// ----------------------------------------------------------------------

const FILTERS = [
  { key: "all", label: "All" },
  { key: "overdue", label: "Overdue" },
  { key: "today", label: "Today" },
  { key: "upcoming", label: "Upcoming" },
  { key: "kept", label: "Kept" },
];

export default function CommitmentsPage() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);

  const searchTerm = isSearchableQuery(query) ? query.trim() : "";

  const { items, counts, isLoading, error, markKept, snooze, dismiss } = useCommitments({
    status: activeFilter,
    q: searchTerm,
  });

  const handleDismiss = (id, reason) => {
    dismiss(id, reason);
    setSelected(null);
  };

  const handleMarkKept = (id) => {
    markKept(id);
    setSelected(null);
  };

  return (
    <div className="min-h-screen bg-[#0F1220] pb-24 sm:pb-10">
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#0F1220]/90 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-4 pb-4 pt-5 sm:px-6">
          <h1 className="font-['Space_Grotesk'] text-[22px] font-medium text-[#EDEFF5] sm:text-[26px]">
            Commitments
          </h1>
          <p className="mt-1 text-sm text-[#8A8FA3]">Everything you've promised, in one thread.</p>

          {/* Search */}
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#171B2E] px-3.5 py-2.5 focus-within:border-[#D4A24C]/40">
            <Search className="h-4 w-4 shrink-0 text-[#8A8FA3]" strokeWidth={1.75} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search commitments…"
              className="w-full bg-transparent text-sm text-[#EDEFF5] placeholder:text-[#8A8FA3] focus:outline-none"
            />
            {query && (
              <button onClick={() => setQuery("")} aria-label="Clear search">
                <X className="h-3.5 w-3.5 text-[#8A8FA3]" strokeWidth={2} />
              </button>
            )}
            <SlidersHorizontal className="h-4 w-4 shrink-0 text-[#8A8FA3] sm:hidden" strokeWidth={1.75} />
          </div>

          {/* Filter tabs */}
          <div className="mt-4 flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
            {FILTERS.map((f) => {
              const active = activeFilter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setActiveFilter(f.key)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                    active
                      ? "bg-[#D4A24C] text-[#0F1220]"
                      : "border border-white/[0.08] text-[#8A8FA3] hover:text-[#EDEFF5]"
                  }`}
                >
                  {f.label}
                  <span className={`font-['IBM_Plex_Mono'] text-[11px] ${active ? "text-[#0F1220]/70" : "text-[#8A8FA3]/70"}`}>
                    {counts[f.key]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pt-6 sm:px-6">
        {error && (
          <p className="mb-4 rounded-lg border border-[#E8637A]/25 bg-[#E8637A]/10 px-3.5 py-2.5 text-sm text-[#E8637A]">
            {error}
          </p>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-[78px] animate-pulse rounded-xl border border-white/[0.06] bg-[#171B2E]" />
            ))}
          </div>
        ) : (
          <CommitmentList
            items={items}
            onSelect={setSelected}
            onToggleKept={markKept}
            searchQuery={searchTerm}
            onClearSearch={() => setQuery("")}
          />
        )}
      </main>

      <CommitmentDetail
        item={selected}
        onClose={() => setSelected(null)}
        onToggleKept={handleMarkKept}
        onSnooze={snooze}
        onDismiss={handleDismiss}
      />
    </div>
  );
}