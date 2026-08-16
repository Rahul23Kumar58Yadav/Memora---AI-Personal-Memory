import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { commitmentsApi } from "../api/commitments.api";

// ----------------------------------------------------------------------
// Memora — commitmentsSlice
// Redux Toolkit equivalent of useCommitments.js. Keep/snooze/dismiss are
// optimistic: the reducer updates local state in `pending`, and rolls
// back in `rejected` using the snapshot stashed on the thunk's meta.
// ----------------------------------------------------------------------

const initialState = {
  items: [],
  summary: { overdue: 0, today: 0, upcoming: 0, keptThisMonth: 0 },
  status: "idle",
  error: null,
};

export const fetchCommitments = createAsyncThunk(
  "commitments/fetchAll",
  async ({ status = "all", q = "" } = {}, { rejectWithValue }) => {
    try {
      const [{ items }, summary] = await Promise.all([
        commitmentsApi.list({ status, q }),
        commitmentsApi.getSummary(),
      ]);
      return { items, summary };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const markKept = createAsyncThunk(
  "commitments/markKept",
  async (id, { getState, rejectWithValue }) => {
    const previous = getState().commitments.items.find((it) => it.id === id);
    try {
      return await commitmentsApi.markKept(id);
    } catch (err) {
      return rejectWithValue({ id, previous, message: err.message });
    }
  }
);

export const snoozeCommitment = createAsyncThunk(
  "commitments/snooze",
  async ({ id, dueDate }, { rejectWithValue }) => {
    try {
      return await commitmentsApi.snooze(id, dueDate);
    } catch (err) {
      return rejectWithValue({ id, message: err.message });
    }
  }
);

export const dismissCommitment = createAsyncThunk(
  "commitments/dismiss",
  async ({ id, reason }, { getState, rejectWithValue }) => {
    const previous = getState().commitments.items;
    try {
      await commitmentsApi.dismiss(id, reason);
      return { id };
    } catch (err) {
      return rejectWithValue({ id, previous, message: err.message });
    }
  }
);

const commitmentsSlice = createSlice({
  name: "commitments",
  initialState,
  reducers: {
    clearCommitmentsError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetch
      .addCase(fetchCommitments.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchCommitments.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload.items;
        state.summary = action.payload.summary;
      })
      .addCase(fetchCommitments.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })

      // mark kept — optimistic
      .addCase(markKept.pending, (state, action) => {
        const item = state.items.find((it) => it.id === action.meta.arg);
        if (item) {
          item.urgency = "kept";
          item.group = "Kept";
          item.due = "Kept just now";
        }
      })
      .addCase(markKept.fulfilled, (state, action) => {
        const idx = state.items.findIndex((it) => it.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
      })
      .addCase(markKept.rejected, (state, action) => {
        const { id, previous, message } = action.payload || {};
        state.error = message || "Couldn't mark this as kept.";
        if (previous) {
          const idx = state.items.findIndex((it) => it.id === id);
          if (idx !== -1) state.items[idx] = previous;
        }
      })

      // snooze
      .addCase(snoozeCommitment.fulfilled, (state, action) => {
        const idx = state.items.findIndex((it) => it.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
      })
      .addCase(snoozeCommitment.rejected, (state, action) => {
        state.error = action.payload?.message || "Couldn't snooze this commitment.";
      })

      // dismiss — optimistic removal
      .addCase(dismissCommitment.pending, (state, action) => {
        state.items = state.items.filter((it) => it.id !== action.meta.arg.id);
      })
      .addCase(dismissCommitment.rejected, (state, action) => {
        const { previous, message } = action.payload || {};
        state.error = message || "Couldn't dismiss this commitment.";
        if (previous) state.items = previous;
      });
  },
});

export const { clearCommitmentsError } = commitmentsSlice.actions;

// ---- selectors ----------------------------------------------------------
export const selectCommitments = (state) => state.commitments.items;
export const selectCommitmentsSummary = (state) => state.commitments.summary;
export const selectCommitmentsStatus = (state) => state.commitments.status;
export const selectCommitmentsError = (state) => state.commitments.error;

export const selectCommitmentCounts = (state) => {
  const items = state.commitments.items;
  return {
    all: items.length,
    overdue: items.filter((i) => i.urgency === "overdue").length,
    today: items.filter((i) => i.urgency === "today").length,
    upcoming: items.filter((i) => i.urgency === "upcoming").length,
    kept: items.filter((i) => i.urgency === "kept").length,
  };
};

export default commitmentsSlice.reducer;