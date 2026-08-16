import { createSlice, createAsyncThunk, nanoid } from "@reduxjs/toolkit";
import { chatApi } from "../api/chat.api";

// ----------------------------------------------------------------------
// Memora — chatSlice
// Redux Toolkit equivalent of useChat.js. Appends the user message
// synchronously (so it renders instantly), then resolves the assistant
// reply via the async thunk.
// ----------------------------------------------------------------------

const WELCOME_MESSAGE = {
  id: "welcome",
  role: "assistant",
  text: "I'm listening across what you've connected. Ask me anything you might've forgotten.",
  sources: [],
};

const initialState = {
  messages: [WELCOME_MESSAGE],
  sessionId: null,
  isThinking: false,
  error: null,
};

export const sendMessage = createAsyncThunk(
  "chat/sendMessage",
  async (text, { getState, rejectWithValue }) => {
    try {
      const { sessionId } = getState().chat;
      const res = await chatApi.ask({ query: text, sessionId });
      return res; // { text, sources, sessionId? }
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    resetConversation(state) {
      state.messages = [WELCOME_MESSAGE];
      state.sessionId = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendMessage.pending, (state, action) => {
        state.isThinking = true;
        state.error = null;
        state.messages.push({
          id: nanoid(),
          role: "user",
          text: action.meta.arg,
        });
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.isThinking = false;
        if (action.payload.sessionId) state.sessionId = action.payload.sessionId;
        state.messages.push({
          id: nanoid(),
          role: "assistant",
          text: action.payload.text,
          sources: action.payload.sources || [],
        });
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.isThinking = false;
        state.error = action.payload || "Something went wrong.";
        state.messages.push({
          id: nanoid(),
          role: "assistant",
          text: "Something broke on my end reaching your data. Try again in a moment.",
          sources: [],
        });
      });
  },
});

export const { resetConversation } = chatSlice.actions;

// ---- selectors ----------------------------------------------------------
export const selectMessages = (state) => state.chat.messages;
export const selectIsThinking = (state) => state.chat.isThinking;
export const selectChatError = (state) => state.chat.error;

export default chatSlice.reducer;