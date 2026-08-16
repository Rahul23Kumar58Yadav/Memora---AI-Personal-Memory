import React from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ChatWindow from "../components/chat/ChatWindow";
import { useChat } from "../hooks/useChat";

// ----------------------------------------------------------------------
// Memora — ChatPage (refactored)
// Was previously ~200 lines owning message state, scroll logic, the
// composer, and a mocked askMemora() all in one file. Now just:
//   - useChat() owns messages / sending / typing state and calls the
//     real chatApi.ask() under the hood
//   - <ChatWindow /> owns the scroll/typing-indicator/suggestions UI
// This file is left with only what's actually page-specific: the header.
// ----------------------------------------------------------------------

const SUGGESTED_PROMPTS = [
  "Did I already pay the electricity bill?",
  "What did I agree to with the vendor last week?",
  "Where did I save the Q3 budget file?",
  "What's still open with Priya?",
];

export default function ChatPage() {
  const navigate = useNavigate();
  const { messages, sendMessage, isThinking, error } = useChat();

  return (
    <div className="flex h-screen flex-col bg-[#0F1220]">
      {/* Header */}
      <header className="flex shrink-0 items-center gap-3 border-b border-white/[0.06] bg-[#0F1220]/95 px-4 py-3.5 backdrop-blur-md sm:px-6">
        <button
          onClick={() => navigate(-1)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-[#8A8FA3] transition-colors hover:bg-white/[0.06] hover:text-[#EDEFF5]"
          aria-label="Back"
        >
          <ArrowLeft className="h-4.5 w-4.5" strokeWidth={1.75} />
        </button>
        <div className="min-w-0">
          <p className="font-['Space_Grotesk'] text-[15px] font-medium leading-none text-[#EDEFF5]">
            Ask Memora
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-[11px] text-[#8A8FA3]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#5EC8B8]" />
            Gmail, Calendar &amp; WhatsApp connected
          </p>
        </div>
      </header>

      {error && (
        <p className="shrink-0 border-b border-[#E8637A]/20 bg-[#E8637A]/[0.06] px-4 py-2 text-center text-xs text-[#E8637A] sm:px-6">
          {error}
        </p>
      )}

      <ChatWindow
        messages={messages}
        onSend={sendMessage}
        isThinking={isThinking}
        suggestedPrompts={SUGGESTED_PROMPTS}
      />
    </div>
  );
}