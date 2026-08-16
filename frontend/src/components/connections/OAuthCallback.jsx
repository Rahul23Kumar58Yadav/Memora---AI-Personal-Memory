import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { connectionsApi } from "../../api/connections.api";

// ----------------------------------------------------------------------
// Memora — OAuthCallback
// Landing page for the OAuth redirect, e.g.
//   /connections/:provider/callback?code=...&state=...
// Exchanges the code for a connection via connectionsApi.completeOAuth,
// then redirects back to /connections. Handles the provider-denied and
// network-failure cases explicitly rather than silently redirecting.
//
// Router setup:
//   <Route path="/connections/:provider/callback" element={<OAuthCallback />} />
// ----------------------------------------------------------------------

const STATUS = {
  LOADING: "loading",
  SUCCESS: "success",
  ERROR: "error",
  DENIED: "denied",
};

export default function OAuthCallback() {
  const { provider } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState(STATUS.LOADING);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const oauthError = searchParams.get("error"); // e.g. "access_denied"

    if (oauthError) {
      setStatus(STATUS.DENIED);
      return;
    }

    if (!code) {
      setStatus(STATUS.ERROR);
      setErrorMessage("Missing authorization code from the provider.");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        await connectionsApi.completeOAuth(provider, { code, state });
        if (cancelled) return;
        setStatus(STATUS.SUCCESS);
        setTimeout(() => navigate("/connections", { replace: true }), 1400);
      } catch (err) {
        if (cancelled) return;
        setStatus(STATUS.ERROR);
        setErrorMessage(err.message || "Couldn't complete the connection.");
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider]);

  const providerLabel = provider ? provider.charAt(0).toUpperCase() + provider.slice(1) : "your account";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0F1220] px-6 text-center">
      {status === STATUS.LOADING && (
        <>
          <Loader2 className="h-8 w-8 animate-spin text-[#D4A24C]" strokeWidth={1.75} />
          <h1 className="mt-5 font-['Space_Grotesk'] text-[20px] font-medium text-[#EDEFF5]">
            Connecting {providerLabel}…
          </h1>
          <p className="mt-2 text-sm text-[#8A8FA3]">This should only take a moment.</p>
        </>
      )}

      {status === STATUS.SUCCESS && (
        <>
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#5EC8B8]/10">
            <CheckCircle2 className="h-7 w-7 text-[#5EC8B8]" strokeWidth={1.75} />
          </span>
          <h1 className="mt-5 font-['Space_Grotesk'] text-[20px] font-medium text-[#EDEFF5]">
            {providerLabel} connected
          </h1>
          <p className="mt-2 text-sm text-[#8A8FA3]">Taking you back to your connections…</p>
        </>
      )}

      {status === STATUS.DENIED && (
        <>
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#8A8FA3]/10">
            <XCircle className="h-7 w-7 text-[#8A8FA3]" strokeWidth={1.75} />
          </span>
          <h1 className="mt-5 font-['Space_Grotesk'] text-[20px] font-medium text-[#EDEFF5]">
            Permission not granted
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-sm text-[#8A8FA3]">
            You'll need to accept the requested access for Memora to read {providerLabel}.
          </p>
          <button
            onClick={() => navigate("/connections", { replace: true })}
            className="mt-6 rounded-full bg-[#D4A24C] px-6 py-3 text-sm font-medium text-[#0F1220] transition-transform hover:scale-[1.02]"
          >
            Back to connections
          </button>
        </>
      )}

      {status === STATUS.ERROR && (
        <>
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#E8637A]/10">
            <XCircle className="h-7 w-7 text-[#E8637A]" strokeWidth={1.75} />
          </span>
          <h1 className="mt-5 font-['Space_Grotesk'] text-[20px] font-medium text-[#EDEFF5]">
            Something went wrong
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-sm text-[#8A8FA3]">{errorMessage}</p>
          <button
            onClick={() => navigate("/connections", { replace: true })}
            className="mt-6 rounded-full bg-[#D4A24C] px-6 py-3 text-sm font-medium text-[#0F1220] transition-transform hover:scale-[1.02]"
          >
            Try again
          </button>
        </>
      )}
    </div>
  );
}