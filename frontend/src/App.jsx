import React from "react";
import "./styles/globals.css";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import AppRoutes from "./routes/AppRoutes";

// ----------------------------------------------------------------------
// Memora — App
// Root component. Provider order matters here:
//   1. ErrorBoundary — outermost, so a crash anywhere below still shows
//      something recoverable instead of a blank white screen.
//   2. ThemeProvider — sets data-theme on <html> before anything paints.
//   3. AuthProvider — AppRoutes' ProtectedRoute / RedirectIfAuthenticated
//      both call useAuth(), so this must wrap AppRoutes.
//   4. AppRoutes — owns its own <BrowserRouter> internally, so it is NOT
//      wrapped in a second Router here.
//
// If you went with the Redux store (store/store.js) instead of
// AuthContext, swap AuthProvider for <Provider store={store}> and see
// the note at the bottom of this file.
// ----------------------------------------------------------------------

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // TODO: send to real error tracking (Sentry, etc.)
    console.error("Memora crashed:", error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#0F1220] px-6 text-center">
          <p className="font-['IBM_Plex_Mono'] text-sm text-[#8A8FA3]">Something snapped</p>
          <h1 className="mt-2 font-['Space_Grotesk'] text-[24px] font-medium text-[#EDEFF5]">
            Memora hit an unexpected error.
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-sm text-[#8A8FA3]">
            Nothing you were tracking was lost — just this screen. Reloading usually fixes it.
          </p>
          <button
            onClick={this.handleReload}
            className="mt-6 rounded-full bg-[#D4A24C] px-6 py-3 text-sm font-medium text-[#0F1220] transition-transform hover:scale-[1.02]"
          >
            Reload Memora
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

// ----------------------------------------------------------------------
// Redux alternative — if using store/store.js instead of AuthContext,
// replace the export above with:
//
// import { Provider } from "react-redux";
// import { store } from "./store/store";
//
// export default function App() {
//   return (
//     <ErrorBoundary>
//       <ThemeProvider>
//         <Provider store={store}>
//           <AppRoutes />
//         </Provider>
//       </ThemeProvider>
//     </ErrorBoundary>
//   );
// }
//
// Do not use both AuthProvider and <Provider store={store}> at once —
// pick one auth state strategy (see the note left in store/store.js).
// ----------------------------------------------------------------------