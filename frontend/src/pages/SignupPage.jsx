import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, ArrowRight, Mail, Lock, User, Check } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

// ----------------------------------------------------------------------
// Memora -- Signup
// Mirrors LoginPage's restrained auth-screen treatment. Wired to
// useAuth() -- signup() calls the real POST /api/auth/signup endpoint
// and navigates to /dashboard on success, same pattern as LoginPage.
// ----------------------------------------------------------------------

function getStrength(password) {
  if (!password) return { label: "", score: 0 };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const labels = ["Weak", "Fair", "Good", "Strong"];
  return { label: labels[Math.max(score - 1, 0)], score };
}

const STRENGTH_COLOR = ["#E8637A", "#D4A24C", "#D4A24C", "#5EC8B8"];

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const { signup } = useAuth();
  const navigate = useNavigate();

  const strength = useMemo(() => getStrength(password), [password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name || !email || !password) {
      setError("Fill in every field to create your account.");
      return;
    }
    if (password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }
    if (!agreed) {
      setError("Accept the terms to continue.");
      return;
    }

    setIsSubmitting(true);
    try {
      await signup({ name, email, password });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Something went wrong creating your account. Try again.");
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
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-[#5EC8B8]/60" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#5EC8B8]" />
          </div>

          <h1 className="font-['Space_Grotesk'] text-[28px] font-medium leading-tight text-[#EDEFF5]">
            Start your thread.
          </h1>
          <p className="mt-2 text-[15px] text-[#8A8FA3]">
            Free to try. Connect your first account in under a minute.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {/* Name */}
            <div>
              <label htmlFor="name" className="mb-1.5 block text-xs font-medium text-[#8A8FA3]">
                Name
              </label>
              <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-[#171B2E] px-3.5 py-3 focus-within:border-[#D4A24C]/40">
                <User className="h-4 w-4 shrink-0 text-[#8A8FA3]" strokeWidth={1.75} />
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Aarav Sharma"
                  className="w-full bg-transparent text-[15px] text-[#EDEFF5] placeholder:text-[#8A8FA3]/60 focus:outline-none"
                />
              </div>
            </div>

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
              <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-[#8A8FA3]">
                Password
              </label>
              <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-[#171B2E] px-3.5 py-3 focus-within:border-[#D4A24C]/40">
                <Lock className="h-4 w-4 shrink-0 text-[#8A8FA3]" strokeWidth={1.75} />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
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

              {password && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex h-1 flex-1 gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <span
                        key={i}
                        className="h-full flex-1 rounded-full transition-colors"
                        style={{
                          backgroundColor: i < strength.score ? STRENGTH_COLOR[strength.score - 1] : "rgba(255,255,255,0.08)",
                        }}
                      />
                    ))}
                  </div>
                  <span className="font-['IBM_Plex_Mono'] text-[11px] text-[#8A8FA3]">{strength.label}</span>
                </div>
              )}
            </div>

            {/* Terms */}
            <label className="flex cursor-pointer items-start gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setAgreed((v) => !v)}
                className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors ${
                  agreed ? "border-[#D4A24C] bg-[#D4A24C]" : "border-white/20"
                }`}
              >
                {agreed && <Check className="h-3 w-3 text-[#0F1220]" strokeWidth={3} />}
              </button>
              <span className="text-xs leading-relaxed text-[#8A8FA3]">
                I agree to Memora's{" "}
                <a href="/terms" className="text-[#EDEFF5] hover:underline">Terms</a> and{" "}
                <a href="/privacy" className="text-[#EDEFF5] hover:underline">Privacy Policy</a>.
              </span>
            </label>

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
              {isSubmitting ? "Creating your account…" : "Create account"}
              {!isSubmitting && <ArrowRight className="h-4 w-4" strokeWidth={2.25} />}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-[#8A8FA3]">
            Already have an account?{" "}
            <a href="/login" className="font-medium text-[#EDEFF5] hover:underline">
              Sign in
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}