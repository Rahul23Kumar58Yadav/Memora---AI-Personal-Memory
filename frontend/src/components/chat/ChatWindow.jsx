import React, { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";

// ----------------------------------------------------------------------
// Memora — ChatWindow
// Orchestrates the message list (auto-scroll, typing indicator, empty
// state with suggested prompts) and the composer. ChatPage owns the
// actual message state + the call to askMemora(); this component is
// the reusable "conversation" shell around it.
//
// Props:
//   messages: Message[]
//   onSend(text): void
//   isThinking?: boolean
//   suggestedPrompts?: string[]
//   onSourceClick?(source): void
// ----------------------------------------------------------------------

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 text-[#8A8FA3]">
      <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
      <span className="text-xs">Tracing back through your memory…</span>
    </div>
  );
}

export default function ChatWindow({
  messages = [],
  onSend,
  isThinking = false,
  suggestedPrompts = [],
  onSourceClick,
}) {
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isThinking]);

  const showSuggestions = suggestedPrompts.length > 0 && messages.length <= 1;

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-6">
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} onSourceClick={onSourceClick} />
          ))}

          {isThinking && <TypingIndicator />}

          {showSuggestions && (
            <div className="mt-2">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[#8A8FA3]">
                Try asking
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {suggestedPrompts.map((p) => (
                  <button
                    key={p}
                    onClick={() => onSend(p)}
                    className="rounded-xl border border-white/[0.06] bg-[#171B2E] px-4 py-3 text-left text-[13px] text-[#EDEFF5] transition-colors hover:border-[#D4A24C]/40 hover:bg-[#1F2440]"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <ChatInput onSend={onSend} disabled={isThinking} />
    </div>
  );
}