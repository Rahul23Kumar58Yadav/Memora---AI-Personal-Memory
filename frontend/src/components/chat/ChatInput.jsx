import React, { useRef, useState } from "react";
import { ArrowUp } from "lucide-react";

// ----------------------------------------------------------------------
// Memora — ChatInput
// Auto-growing textarea + send button, pinned to the bottom of ChatWindow.
// Enter sends, Shift+Enter newlines. Respects iOS safe-area for the
// bottom-tab-bar layout.
//
// Props:
//   onSend(text): void
//   disabled?: boolean       — true while the assistant is responding
//   placeholder?: string
// ----------------------------------------------------------------------

export default function ChatInput({ onSend, disabled = false, placeholder = "Ask what you forgot…" }) {
  const [value, setValue] = useState("");
  const textareaRef = useRef(null);

  const reset = () => {
    setValue("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleSend = () => {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    reset();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const autoGrow = (e) => {
    setValue(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
  };

  return (
    <div className="shrink-0 border-t border-white/[0.06] bg-[#0F1220] px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 sm:px-6 sm:pb-4">
      <div className="mx-auto flex max-w-2xl items-end gap-2 rounded-2xl border border-white/[0.08] bg-[#171B2E] p-2 pl-4 focus-within:border-[#D4A24C]/40">
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={autoGrow}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="max-h-[140px] flex-1 resize-none bg-transparent py-2 text-[15px] text-[#EDEFF5] placeholder:text-[#8A8FA3] focus:outline-none disabled:opacity-60"
        />
        <button
          onClick={handleSend}
          disabled={!value.trim() || disabled}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#D4A24C] text-[#0F1220] transition-opacity disabled:opacity-30"
          aria-label="Send"
        >
          <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}