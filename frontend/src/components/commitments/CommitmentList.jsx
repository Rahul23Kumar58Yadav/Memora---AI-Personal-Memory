import React, { useMemo } from "react";
import { Inbox, X } from "lucide-react";
import CommitmentCard from "./CommitmentCard";

// ----------------------------------------------------------------------
// Memora — CommitmentList
// Groups commitments (Overdue / Today / This week / Fading / Kept) and
// renders a CommitmentCard thread per group. Handles empty + search-empty
// states. Purely presentational — filtering/searching state lives in the
// parent page (CommitmentsPage), this just renders what it's given.
//
// Props:
//   items: Commitment[]
//   onSelect(item)
//   onToggleKept(id)
//   searchQuery?: string        — used only for the empty-state message
//   onClearSearch?: () => void
//   groupOrder?: string[]       — override default group ordering
// ----------------------------------------------------------------------

const DEFAULT_GROUP_ORDER = ["Overdue", "Today", "This week", "Fading", "Kept"];

export default function CommitmentList({
  items = [],
  onSelect,
  onToggleKept,
  searchQuery = "",
  onClearSearch,
  groupOrder = DEFAULT_GROUP_ORDER,
}) {
  const grouped = useMemo(() => {
    const map = {};
    items.forEach((it) => {
      const key = it.group || "Other";
      if (!map[key]) map[key] = [];
      map[key].push(it);
    });
    const ordered = groupOrder.filter((g) => map[g]?.length).map((g) => ({ group: g, items: map[g] }));
    // include any groups not in groupOrder at the end
    Object.keys(map)
      .filter((g) => !groupOrder.includes(g))
      .forEach((g) => ordered.push({ group: g, items: map[g] }));
    return ordered;
  }, [items, groupOrder]);

  if (grouped.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center">
        <Inbox className="h-6 w-6 text-[#8A8FA3]" strokeWidth={1.5} />
        <p className="mt-3 text-sm text-[#8A8FA3]">
          {searchQuery ? `Nothing matches "${searchQuery}".` : "Nothing here. Your thread is clear."}
        </p>
        {searchQuery && onClearSearch && (
          <button
            onClick={onClearSearch}
            className="mt-3 flex items-center gap-1 text-xs text-[#D4A24C] hover:underline"
          >
            <X className="h-3 w-3" strokeWidth={2} /> Clear search
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {grouped.map(({ group, items: groupItems }) => (
        <section key={group}>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-[#8A8FA3]">
            {group}
          </h2>
          <div className="space-y-2.5">
            {groupItems.map((item) => (
              <CommitmentCard
                key={item.id}
                item={item}
                onSelect={onSelect}
                onToggleKept={onToggleKept}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}