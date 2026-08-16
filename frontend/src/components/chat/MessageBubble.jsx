import React from "react";
import { Sparkles, Mail, Calendar, MessageSquare, FileText } from "lucide-react";

// ----------------------------------------------------------------------
// Memora — MessageBubble
// Renders one turn in the conversation. Assistant messages show source
// chips underneath — the RAG citation layer that lets the user verify
// where an answer came from instead of just trusting it blindly.
//
// Props:
//   message: { id, role: "user" | "assistant", text, sources?: [] }
//   onSourceClick?(source): void
// ----------------------------------------------------------------------

const SOURCE_ICON = { email: Mail, calendar: Calendar, chat: MessageSquare, doc: FileText };

function SourceChip({ source, onClick }) {
  const Icon = SOURCE_ICON[source.type] || FileText;
  return (
    <button
      onClick={() => onClick?.(source)}
      className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-[#171B2E] px-3 py-1.5 text-left transition-colors hover:border-[#D4A24C]/40"
    >
      <Icon className="h-3 w-3 shrink-0 text-[#8A8FA3]" strokeWidth={1.75} />
      <span className="truncate text-[11px] text-[#EDEFF5]">{source.label}</span>
      <span className="hidden shrink-0 font-['IBM_Plex_Mono'] text-[10px] text-[#8A8FA3] sm:inline">
        {source.meta}
      </span>
    </button>
  );
}

export default function MessageBubble({ message, onSourceClick }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[88%] sm:max-w-[75%] ${isUser ? "" : "w-full"}`}>
        {!isUser && (
          <div className="mb-1.5 flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#D4A24C]/15">
              <Sparkles className="h-3 w-3 text-[#D4A24C]" strokeWidth={2} />
            </span>
            <span className="text-[11px] font-medium text-[#8A8FA3]">Memora</span>
          </div>
        )}

        <div
          className={
            isUser
              ? "rounded-2xl rounded-tr-md bg-[#D4A24C] px-4 py-3 text-[15px] leading-relaxed text-[#0F1220]"
              : "rounded-2xl rounded-tl-md border border-white/[0.06] bg-[#171B2E] px-4 py-3.5 text-[15px] leading-relaxed text-[#EDEFF5]"
          }
        >
          {message.text}
        </div>

        {!isUser && message.sources?.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-2">
            {message.sources.map((s) => (
              <SourceChip key={s.id} source={s} onClick={onSourceClick} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}