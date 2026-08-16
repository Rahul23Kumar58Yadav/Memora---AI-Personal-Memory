import { configureStore } from "@reduxjs/toolkit";
import authReducer, { forceLogout } from "./authSlice";
import chatReducer from "./chatSlice";
import commitmentsReducer from "./commitmentsSlice";

// ----------------------------------------------------------------------
// Memora — store
// Combines all slices. If you're using this Redux store, DO NOT also
// wrap the app in <AuthProvider> from context/AuthContext.jsx — pick one
// state strategy for auth, not both, or you'll have two sources of truth.
//
// Usage (main.jsx / index.js):
//   import { Provider } from "react-redux";
//   import { store } from "./store/store";
//   <Provider store={store}><App /></Provider>
// ----------------------------------------------------------------------

export const store = configureStore({
  reducer: {
    auth: authReducer,
    chat: chatReducer,
    commitments: commitmentsReducer,
  },
});

// Same role as the "memora:logout" window event used by the Context
// version — axiosClient.js dispatches this event on a failed token
// refresh; here we translate it straight into a store dispatch.
window.addEventListener("memora:logout", () => {
  store.dispatch(forceLogout());
});