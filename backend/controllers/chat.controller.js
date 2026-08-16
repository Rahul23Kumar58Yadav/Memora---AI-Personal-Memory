import ChatSession from "../models/ChatSession.js";
import { answerQuery } from "../services/llm/ragQuery.js";
import { logger } from "../utils/logger.js";

// ----------------------------------------------------------------------
// Memora Backend — chat.controller
// Maps to chat.routes.js. The actual RAG pipeline (embed query → vector
// search → LLM synthesis with citations) lives in services/llm/
// ragQuery.js — this controller's job is just session persistence
// around that call: load history for context, append the exchange,
// return the shape ChatWindow.jsx / useChat.js expect.
// ----------------------------------------------------------------------

// ---- POST /chat/query -------------------------------------------------------
export async function ask(req, res, next) {
  try {
    const { query, sessionId } = req.body;
    if (!query?.trim()) {
      return res.status(400).json({ message: "Query cannot be empty." });
    }

    let session;
    if (sessionId) {
      session = await ChatSession.findOne({ _id: sessionId, userId: req.userId });
    }
    if (!session) {
      session = new ChatSession({ userId: req.userId, messages: [] });
    }

    // answerQuery handles: embed the query, run vectorSearchEmbeddings,
    // synthesize an answer with the LLM, and return citations mapped to
    // source metadata. Recent session messages are passed for
    // conversational context (e.g. "what about next week?" follow-ups).
    const recentHistory = session.messages.slice(-6).map((m) => ({ role: m.role, text: m.text }));
    const result = await answerQuery({ query, userId: req.userId, history: recentHistory });

    session.appendMessage({ role: "user", text: query });
    session.appendMessage({ role: "assistant", text: result.text, sources: result.sources });
    await session.save();

    return res.json({ text: result.text, sources: result.sources, sessionId: session.id });
  } catch (err) {
    logger.error("Chat query failed", { userId: req.userId, error: err.message });
    next(err);
  }
}

// ---- GET /chat/sessions -----------------------------------------------------
export async function listSessions(req, res, next) {
  try {
    const sessions = await ChatSession.find({ userId: req.userId })
      .sort({ lastMessageAt: -1 })
      .select("title lastMessageAt createdAt")
      .limit(50);

    return res.json({ sessions });
  } catch (err) {
    next(err);
  }
}

// ---- GET /chat/sessions/:id --------------------------------------------------
export async function getSession(req, res, next) {
  try {
    const session = await ChatSession.findOne({ _id: req.params.id, userId: req.userId });
    if (!session) {
      return res.status(404).json({ message: "Conversation not found." });
    }
    return res.json({ session });
  } catch (err) {
    next(err);
  }
}

// ---- DELETE /chat/sessions/:id ------------------------------------------------
export async function deleteSession(req, res, next) {
  try {
    const result = await ChatSession.deleteOne({ _id: req.params.id, userId: req.userId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Conversation not found." });
    }
    return res.json({ message: "Conversation deleted." });
  } catch (err) {
    next(err);
  }
}