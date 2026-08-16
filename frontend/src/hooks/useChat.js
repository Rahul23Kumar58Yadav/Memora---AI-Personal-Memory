import { useCallback, useState } from "react";
import { chatApi } from "../api/chat.api";

// ----------------------------------------------------------------------
// Memora — useChat
// Owns the message list + in-flight state for a chat session. Designed
// to plug straight into <ChatWindow messages={} onSend={} isThinking={} />.
// ----------------------------------------------------------------------

const WELCOME_MESSAGE = {
  id: "welcome",
  role: "assistant",
  text: "I'm listening across what you've connected. Ask me anything you might've forgotten.",
  sources: [],
};

export function useChat({ sessionId: initialSessionId } = {}) {
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [sessionId, setSessionId] = useState(initialSessionId ?? null);
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState("");

  const sendMessage = useCallback(
    async (text) => {
      const trimmed = text?.trim();
      if (!trimmed || isThinking) return;

      setError("");
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "user", text: trimmed },
      ]);
      setIsThinking(true);

      try {
        const res = await chatApi.ask({ query: trimmed, sessionId });
        if (res.sessionId) setSessionId(res.sessionId);
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            text: res.text,
            sources: res.sources || [],
          },
        ]);
      } catch (err) {
        setError(err.message);
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            text: "Something broke on my end reaching your data. Try again in a moment.",
            sources: [],
          },
        ]);
      } finally {
        setIsThinking(false);
      }
    },
    [sessionId, isThinking]
  );

  const resetConversation = useCallback(() => {
    setMessages([WELCOME_MESSAGE]);
    setSessionId(null);
    setError("");
  }, []);

  return { messages, sendMessage, isThinking, error, resetConversation, sessionId };
}