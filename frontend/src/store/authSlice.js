import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { authApi } from "../api/auth.api";
import { tokenStore } from "../api/axiosClient";

// ----------------------------------------------------------------------
// Memora — authSlice
// Redux Toolkit equivalent of AuthContext.jsx. Use ONE of the two in
// your app, not both — this file exists for teams that prefer Redux's
// devtools/middleware ecosystem over Context for auth state.
// ----------------------------------------------------------------------

const initialState = {
  user: null,
  status: "idle", // "idle" | "loading" | "succeeded" | "failed"
  error: null,
  isBootstrapped: false, // has the initial "am I already logged in" check run
};

export const bootstrapAuth = createAsyncThunk("auth/bootstrap", async (_, { rejectWithValue }) => {
  if (!tokenStore.getAccessToken()) return null;
  try {
    return await authApi.getCurrentUser();
  } catch (err) {
    tokenStore.clearTokens();
    return rejectWithValue(err.message);
  }
});

export const login = createAsyncThunk("auth/login", async (credentials, { rejectWithValue }) => {
  try {
    return await authApi.login(credentials);
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const signup = createAsyncThunk("auth/signup", async (details, { rejectWithValue }) => {
  try {
    return await authApi.signup(details);
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const loginWithGoogle = createAsyncThunk("auth/loginWithGoogle", async (idToken, { rejectWithValue }) => {
  try {
    return await authApi.loginWithGoogle({ idToken });
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const logout = createAsyncThunk("auth/logout", async () => {
  await authApi.logout();
  return null;
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // Fired by the axiosClient "memora:logout" listener (see store.js)
    // when a token refresh fails — forces local state back to logged-out.
    forceLogout(state) {
      state.user = null;
      state.status = "idle";
    },
    clearAuthError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // bootstrap
      .addCase(bootstrapAuth.pending, (state) => {
        state.status = "loading";
      })
      .addCase(bootstrapAuth.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.user = action.payload;
        state.isBootstrapped = true;
      })
      .addCase(bootstrapAuth.rejected, (state) => {
        state.status = "idle";
        state.user = null;
        state.isBootstrapped = true;
      });

    // shared handler for login/signup/googleLogin
    [login, signup, loginWithGoogle].forEach((thunk) => {
      builder
        .addCase(thunk.pending, (state) => {
          state.status = "loading";
          state.error = null;
        })
        .addCase(thunk.fulfilled, (state, action) => {
          state.status = "succeeded";
          state.user = action.payload;
        })
        .addCase(thunk.rejected, (state, action) => {
          state.status = "failed";
          state.error = action.payload || "Authentication failed.";
        });
    });

    builder.addCase(logout.fulfilled, (state) => {
      state.user = null;
      state.status = "idle";
    });
  },
});

export const { forceLogout, clearAuthError } = authSlice.actions;

// ---- selectors ----------------------------------------------------------
export const selectUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => Boolean(state.auth.user);
export const selectAuthStatus = (state) => state.auth.status;
export const selectAuthError = (state) => state.auth.error;
export const selectIsAuthBootstrapped = (state) => state.auth.isBootstrapped;

export default authSlice.reducer;