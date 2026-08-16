import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff, ArrowRight, Mail, Lock } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

// ----------------------------------------------------------------------
// Memora -- Login
// Quiet, single-column auth screen. The thread motif shows up small and
// restrained here (a single dotted line + knot) rather than the full
// hero treatment -- this screen's job is speed, not persuasion.
//
// Wired to useAuth() (AuthContext) -- login() calls the real
// POST /api/auth/login endpoint, and on success navigates to /dashboard
// (or back to wherever ProtectedRoute originally redirected the user
// FROM, via location.state.from -- see ProtectedRoute.jsx).
// ----------------------------------------------------------------------

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo = location.state?.from?.pathname || "/dashboard";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Enter your email and password to continue.");
      return;
    }

    setIsSubmitting(true);
    try {
      await login({ email, password });
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message || "That email and password don't match. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#0F1220]">
      {/* Header */}
      <header className="px-5 py-6 sm:px-8">
        <a href="/" className="font-['Space_Grotesk'] text-[18px] font-medium text-[#EDEFF5]">
          Memora
        </a>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 pb-16 sm:px-8">
        <div className="w-full max-w-[380px]">
          {/* thread accent */}
          <div className="mb-7 flex items-center gap-2">
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-[#D4A24C]/60" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#D4A24C]" />
          </div>

          <h1 className="font-['Space_Grotesk'] text-[28px] font-medium leading-tight text-[#EDEFF5]">
            Welcome back.
          </h1>
          <p className="mt-2 text-[15px] text-[#8A8FA3]">
            Your thread's been running while you were away.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-[#8A8FA3]">
                Email
              </label>
              <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-[#171B2E] px-3.5 py-3 focus-within:border-[#D4A24C]/40">
                <Mail className="h-4 w-4 shrink-0 text-[#8A8FA3]" strokeWidth={1.75} />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-transparent text-[15px] text-[#EDEFF5] placeholder:text-[#8A8FA3]/60 focus:outline-none"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="block text-xs font-medium text-[#8A8FA3]">
                  Password
                </label>
                <a href="/forgot-password" className="text-xs text-[#D4A24C] hover:underline">
                  Forgot it?
                </a>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-[#171B2E] px-3.5 py-3 focus-within:border-[#D4A24C]/40">
                <Lock className="h-4 w-4 shrink-0 text-[#8A8FA3]" strokeWidth={1.75} />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-transparent text-[15px] text-[#EDEFF5] placeholder:text-[#8A8FA3]/60 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="shrink-0 text-[#8A8FA3] hover:text-[#EDEFF5]"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" strokeWidth={1.75} /> : <Eye className="h-4 w-4" strokeWidth={1.75} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-lg border border-[#E8637A]/25 bg-[#E8637A]/10 px-3.5 py-2.5 text-sm text-[#E8637A]">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#D4A24C] py-3.5 text-sm font-medium text-[#0F1220] transition-transform hover:scale-[1.01] disabled:opacity-50"
            >
              {isSubmitting ? "Signing in…" : "Sign in"}
              {!isSubmitting && <ArrowRight className="h-4 w-4" strokeWidth={2.25} />}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-[#8A8FA3]">
            New to Memora?{" "}
            <a href="/signup" className="font-medium text-[#EDEFF5] hover:underline">
              Create an account
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}