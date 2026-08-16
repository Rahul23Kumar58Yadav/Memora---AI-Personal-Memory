import React from "react";
import { Mail, Calendar, MessageSquare, FileText, Check } from "lucide-react";

// ----------------------------------------------------------------------
// Memora — CommitmentCard
// Reusable single-commitment row. Used by CommitmentList (and could be
// reused on Dashboard's thread). Pure presentational — no data fetching.
//
// Props:
//   item: { id, text, source, context, due, urgency }
//   onSelect(item)     — click card body to open detail view
//   onToggleKept(id)   — click the check action
//   showThread: bool   — render the connecting thread line (for list view)
//   isLast: bool       — suppress thread line on last item
// ----------------------------------------------------------------------

const SOURCE_ICON = { email: Mail, calendar: Calendar, chat: MessageSquare, doc: FileText };

const URGENCY_STYLES = {
  overdue: { dot: "bg-[#E8637A]", ring: "ring-[#E8637A]/30", pill: "bg-[#E8637A]/10 text-[#E8637A] border border-[#E8637A]/25" },
  today: { dot: "bg-[#D4A24C]", ring: "ring-[#D4A24C]/30", pill: "bg-[#D4A24C]/10 text-[#D4A24C] border border-[#D4A24C]/25" },
  upcoming: { dot: "bg-[#5EC8B8]", ring: "ring-[#5EC8B8]/30", pill: "bg-[#5EC8B8]/10 text-[#5EC8B8] border border-[#5EC8B8]/25" },
  stale: { dot: "bg-[#8A8FA3]", ring: "ring-[#8A8FA3]/30", pill: "bg-[#8A8FA3]/10 text-[#8A8FA3] border border-[#8A8FA3]/25" },
  kept: { dot: "bg-[#5EC8B8]", ring: "ring-[#5EC8B8]/30", pill: "bg-[#5EC8B8]/10 text-[#5EC8B8] border border-[#5EC8B8]/25" },
};

export default function CommitmentCard({
  item,
  onSelect,
  onToggleKept,
  showThread = false,
  isLast = false,
}) {
  const style = URGENCY_STYLES[item.urgency] || URGENCY_STYLES.upcoming;
  const SourceIcon = SOURCE_ICON[item.source] || FileText;
  const isKept = item.urgency === "kept";

  return (
    <div className={`relative flex gap-4 ${showThread ? "pb-7 last:pb-0" : ""}`}>
      {showThread && !isLast && (
        <span className="absolute left-[9px] top-5 h-full w-px bg-gradient-to-b from-white/15 to-white/[0.03]" />
      )}

      <span
        className={`relative z-10 mt-1.5 flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full bg-[#0F1220] ring-4 ${style.ring}`}
      >
        <span className={`h-2 w-2 rounded-full ${style.dot}`} />
      </span>

      <button
        onClick={() => onSelect?.(item)}
        className="group min-w-0 flex-1 rounded-xl border border-white/[0.06] bg-[#171B2E] p-4 text-left transition-colors hover:border-white/[0.12]"
      >
        <div className="flex items-start justify-between gap-3">
          <p
            className={`text-[15px] leading-snug ${
              isKept ? "text-[#8A8FA3] line-through decoration-white/20" : "text-[#EDEFF5]"
            }`}
          >
            {item.text}
          </p>
          <span
            className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 font-['IBM_Plex_Mono'] text-[11px] ${style.pill}`}
          >
            {item.due}
          </span>
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-1.5 text-xs text-[#8A8FA3]">
            <SourceIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
            <span className="truncate">{item.context}</span>
          </div>

          {!isKept && onToggleKept && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onToggleKept(item.id);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.stopPropagation();
                  onToggleKept(item.id);
                }
              }}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/[0.08] text-[#8A8FA3] opacity-0 transition-all hover:border-[#5EC8B8]/50 hover:text-[#5EC8B8] group-hover:opacity-100"
              aria-label="Mark as kept"
            >
              <Check className="h-3.5 w-3.5" strokeWidth={2.25} />
            </span>
          )}
        </div>
      </button>
    </div>
  );
}