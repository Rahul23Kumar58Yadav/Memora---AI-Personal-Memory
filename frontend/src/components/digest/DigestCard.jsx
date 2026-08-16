import React, { useState } from "react";
import {
  ChevronDown,
  Mail,
  Bell,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Flame,
} from "lucide-react";

// ----------------------------------------------------------------------
// Memora — DigestCard
// One delivered digest ("You promised X by Friday"), collapsed to a
// one-line summary by default, expandable to show the individual
// commitments it surfaced that day.
//
// Props:
//   digest: {
//     id, date, dayLabel,           // e.g. "Today", "Yesterday", "Aug 3"
//     channel: "email" | "push",
//     stats: { overdue, dueToday, kept },
//     items: [{ id, text, urgency, due }]
//   }
//   defaultOpen?: boolean
// ----------------------------------------------------------------------

const CHANNEL_ICON = { email: Mail, push: Bell };

const URGENCY_DOT = {
  overdue: "bg-[#E8637A]",
  today: "bg-[#D4A24C]",
  upcoming: "bg-[#5EC8B8]",
  stale: "bg-[#8A8FA3]",
  kept: "bg-[#5EC8B8]",
};

export default function DigestCard({ digest, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const ChannelIcon = CHANNEL_ICON[digest.channel] || Bell;
  const { overdue = 0, dueToday = 0, kept = 0 } = digest.stats || {};

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#171B2E]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#D4A24C]/10">
            <Flame className="h-4.5 w-4.5 text-[#D4A24C]" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-['Space_Grotesk'] text-[15px] font-medium text-[#EDEFF5]">
                {digest.dayLabel}
              </p>
              <ChannelIcon className="h-3 w-3 text-[#8A8FA3]" strokeWidth={1.75} />
            </div>
            <p className="mt-0.5 font-['IBM_Plex_Mono'] text-[11px] text-[#8A8FA3]">
              {digest.date}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-4">
          <div className="hidden items-center gap-3 sm:flex">
            {overdue > 0 && (
              <span className="flex items-center gap-1 text-xs text-[#E8637A]">
                <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.75} />
                {overdue}
              </span>
            )}
            {dueToday > 0 && (
              <span className="flex items-center gap-1 text-xs text-[#D4A24C]">
                <Clock className="h-3.5 w-3.5" strokeWidth={1.75} />
                {dueToday}
              </span>
            )}
            {kept > 0 && (
              <span className="flex items-center gap-1 text-xs text-[#5EC8B8]">
                <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                {kept}
              </span>
            )}
          </div>
          <ChevronDown
            className={`h-4 w-4 text-[#8A8FA3] transition-transform ${open ? "rotate-180" : ""}`}
            strokeWidth={1.75}
          />
        </div>
      </button>

      {open && (
        <div className="border-t border-white/[0.06] px-5 py-4">
          {/* Mobile stat row */}
          <div className="mb-3 flex items-center gap-4 sm:hidden">
            {overdue > 0 && (
              <span className="flex items-center gap-1 text-xs text-[#E8637A]">
                <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.75} /> {overdue} overdue
              </span>
            )}
            {dueToday > 0 && (
              <span className="flex items-center gap-1 text-xs text-[#D4A24C]">
                <Clock className="h-3.5 w-3.5" strokeWidth={1.75} /> {dueToday} today
              </span>
            )}
            {kept > 0 && (
              <span className="flex items-center gap-1 text-xs text-[#5EC8B8]">
                <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.75} /> {kept} kept
              </span>
            )}
          </div>

          <ul className="space-y-2.5">
            {digest.items.map((item) => (
              <li key={item.id} className="flex items-center gap-2.5">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${URGENCY_DOT[item.urgency] || "bg-[#8A8FA3]"}`} />
                <span className="min-w-0 flex-1 truncate text-[13px] text-[#EDEFF5]">{item.text}</span>
                <span className="shrink-0 font-['IBM_Plex_Mono'] text-[11px] text-[#8A8FA3]">{item.due}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}