import React, { useState } from "react";
import {
  X,
  Mail,
  Calendar,
  MessageSquare,
  FileText,
  Check,
  Clock,
  Ban,
  ExternalLink,
  Sparkles,
} from "lucide-react";

// ----------------------------------------------------------------------
// Memora — CommitmentDetail
// Slide-over panel showing the full extraction: original source excerpt,
// confidence, editable due date, and actions (keep, snooze, not a
// commitment). This is where users build trust in the extraction, so the
// original quoted text is front and center, not buried.
//
// Props:
//   item: Commitment | null   — null/undefined hides the panel
//   onClose(): void
//   onToggleKept(id): void
//   onSnooze(id, newDate): void
//   onDismiss(id): void       — "this wasn't actually a commitment"
// ----------------------------------------------------------------------

const SOURCE_ICON = { email: Mail, calendar: Calendar, chat: MessageSquare, doc: FileText };
const SOURCE_LABEL = { email: "Email", calendar: "Calendar", chat: "Chat", doc: "Document" };

const URGENCY_STYLES = {
  overdue: { text: "text-[#E8637A]", pill: "bg-[#E8637A]/10 text-[#E8637A] border border-[#E8637A]/25" },
  today: { text: "text-[#D4A24C]", pill: "bg-[#D4A24C]/10 text-[#D4A24C] border border-[#D4A24C]/25" },
  upcoming: { text: "text-[#5EC8B8]", pill: "bg-[#5EC8B8]/10 text-[#5EC8B8] border border-[#5EC8B8]/25" },
  stale: { text: "text-[#8A8FA3]", pill: "bg-[#8A8FA3]/10 text-[#8A8FA3] border border-[#8A8FA3]/25" },
  kept: { text: "text-[#5EC8B8]", pill: "bg-[#5EC8B8]/10 text-[#5EC8B8] border border-[#5EC8B8]/25" },
};

export default function CommitmentDetail({ item, onClose, onToggleKept, onSnooze, onDismiss }) {
  const [snoozing, setSnoozing] = useState(false);
  const [snoozeDate, setSnoozeDate] = useState("");

  if (!item) return null;

  const style = URGENCY_STYLES[item.urgency] || URGENCY_STYLES.upcoming;
  const SourceIcon = SOURCE_ICON[item.source] || FileText;
  const isKept = item.urgency === "kept";

  const handleSnoozeSubmit = () => {
    if (!snoozeDate) return;
    onSnooze?.(item.id, snoozeDate);
    setSnoozing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Panel */}
      <div className="relative flex h-full w-full max-w-md flex-col border-l border-white/[0.08] bg-[#0F1220] sm:max-w-[420px]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <span className={`rounded-full px-2.5 py-1 font-['IBM_Plex_Mono'] text-[11px] ${style.pill}`}>
            {item.due}
          </span>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#8A8FA3] transition-colors hover:bg-white/[0.06] hover:text-[#EDEFF5]"
            aria-label="Close"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-6">
          <h2 className={`font-['Space_Grotesk'] text-[20px] font-medium leading-snug ${isKept ? "text-[#8A8FA3] line-through decoration-white/20" : "text-[#EDEFF5]"}`}>
            {item.text}
          </h2>

          {/* Extraction confidence */}
          <div className="mt-4 flex items-center gap-1.5 text-xs text-[#8A8FA3]">
            <Sparkles className="h-3.5 w-3.5 text-[#D4A24C]" strokeWidth={1.75} />
            Extracted with high confidence
          </div>

          {/* Source excerpt */}
          <div className="mt-6">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#8A8FA3]">
              Found in
            </p>
            <div className="rounded-xl border border-white/[0.06] bg-[#171B2E] p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-[#8A8FA3]">
                  <SourceIcon className="h-3.5 w-3.5" strokeWidth={1.75} />
                  {SOURCE_LABEL[item.source] || "Source"}
                </div>
                <button className="flex items-center gap-1 text-[11px] text-[#D4A24C] hover:underline">
                  Open original
                  <ExternalLink className="h-3 w-3" strokeWidth={2} />
                </button>
              </div>
              <p className="mt-3 font-['IBM_Plex_Mono'] text-[13px] leading-relaxed text-[#EDEFF5]/90">
                {item.context}
              </p>
            </div>
          </div>

          {/* Snooze picker */}
          {snoozing && (
            <div className="mt-5 rounded-xl border border-[#D4A24C]/25 bg-[#D4A24C]/[0.06] p-4">
              <p className="text-xs font-medium text-[#EDEFF5]">Remind me again on</p>
              <div className="mt-2.5 flex items-center gap-2">
                <input
                  type="date"
                  value={snoozeDate}
                  onChange={(e) => setSnoozeDate(e.target.value)}
                  className="flex-1 rounded-lg border border-white/[0.08] bg-[#0F1220] px-3 py-2 font-['IBM_Plex_Mono'] text-xs text-[#EDEFF5]"
                />
                <button
                  onClick={handleSnoozeSubmit}
                  className="shrink-0 rounded-lg bg-[#D4A24C] px-3 py-2 text-xs font-medium text-[#0F1220]"
                >
                  Set
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {!isKept && (
          <div className="border-t border-white/[0.06] px-5 py-4">
            <div className="flex gap-2.5">
              <button
                onClick={() => onToggleKept?.(item.id)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#5EC8B8] py-3 text-sm font-medium text-[#0F1220] transition-transform hover:scale-[1.01]"
              >
                <Check className="h-4 w-4" strokeWidth={2.25} />
                Mark kept
              </button>
              <button
                onClick={() => setSnoozing((v) => !v)}
                className="flex items-center justify-center gap-1.5 rounded-full border border-white/[0.1] px-4 py-3 text-sm text-[#EDEFF5] transition-colors hover:border-white/25"
              >
                <Clock className="h-4 w-4" strokeWidth={1.75} />
                Snooze
              </button>
            </div>
            <button
              onClick={() => onDismiss?.(item.id)}
              className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-full py-2.5 text-xs text-[#8A8FA3] transition-colors hover:text-[#E8637A]"
            >
              <Ban className="h-3.5 w-3.5" strokeWidth={1.75} />
              This wasn't actually a commitment
            </button>
          </div>
        )}
      </div>
    </div>
  );
}