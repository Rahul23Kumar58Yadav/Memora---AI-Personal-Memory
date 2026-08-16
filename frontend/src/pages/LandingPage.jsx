import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Menu,
  X,
  Mail,
  Calendar,
  MessageSquare,
  FileText,
  ArrowRight,
  Check,
} from "lucide-react";

// ----------------------------------------------------------------------
// Memora -- Landing Page
// Hero thesis: a live "memory thread" pulling a scattered promise out of
// an inbox and tying it into a kept commitment. That thread motif carries
// through the whole page as the throughline between sections.
//
// All CTAs are wired to react-router-dom's useNavigate -- "Start free"
// variants go to /signup, "Sign in" goes to /login, "See how it works"
// scrolls to the #how-it-works section instead of navigating away.
// ----------------------------------------------------------------------

const NAV_LINKS = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Connects to", href: "#connects" },
  { label: "Pricing", href: "#pricing" },
];

const CAPABILITIES = [
  {
    title: "Passive recall",
    desc: "Ask in plain language and get the answer pulled straight from your own inbox, docs, and chats -- no digging through folders.",
    example: "\u201cWhere did I save the Q3 budget file?\u201d",
  },
  {
    title: "Active recall",
    desc: "Memora reads the promises buried in your conversations and surfaces them before the deadline passes, not after.",
    example: "\u201cYou told Priya you'd send this by Friday.\u201d",
  },
  {
    title: "One thread, every source",
    desc: "Email, calendar, chat, and documents feed into a single memory -- so nothing depends on which app you happened to use.",
    example: "Gmail \u2192 WhatsApp \u2192 Notion \u2192 one timeline",
  },
];

const SOURCES = [
  { icon: Mail, name: "Gmail & Outlook" },
  { icon: Calendar, name: "Google Calendar" },
  { icon: MessageSquare, name: "Slack & WhatsApp" },
  { icon: FileText, name: "Notion & Drive" },
];

const PLANS = [
  {
    name: "Personal",
    price: "$12",
    period: "/month",
    desc: "For anyone tired of relying on memory alone.",
    features: ["2 connected accounts", "Daily digest", "30-day memory window", "Passive + active recall"],
    highlighted: false,
  },
  {
    name: "Freelance",
    price: "$29",
    period: "/month",
    desc: "Built for people whose word is their business.",
    features: ["Unlimited connected accounts", "Client-tagged commitments", "Unlimited memory window", "Priority extraction accuracy"],
    highlighted: true,
  },
];

function ThreadHero() {
  return (
    <div className="relative mx-auto mt-14 max-w-md sm:mt-16">
      <svg viewBox="0 0 400 180" className="w-full" fill="none">
        <path
          d="M20 30 C 120 30, 100 90, 200 90 S 300 150, 380 150"
          stroke="url(#threadGradient)"
          strokeWidth="1.5"
          strokeDasharray="4 5"
        />
        <defs>
          <linearGradient id="threadGradient" x1="0" y1="0" x2="400" y2="0">
            <stop offset="0%" stopColor="#5EC8B8" stopOpacity="0.5" />
            <stop offset="50%" stopColor="#D4A24C" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#D4A24C" />
          </linearGradient>
        </defs>
      </svg>

      {/* node 1 */}
      <div className="absolute left-0 top-3 flex items-center gap-2 rounded-full border border-white/10 bg-[#171B2E] py-1.5 pl-1.5 pr-3.5 shadow-lg shadow-black/20">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#5EC8B8]/15">
          <Mail className="h-3 w-3 text-[#5EC8B8]" strokeWidth={2} />
        </span>
        <span className="font-['IBM_Plex_Mono'] text-[11px] text-[#EDEFF5]">"I'll send it Friday"</span>
      </div>

      {/* node 2 */}
      <div className="absolute left-1/2 top-[68px] flex -translate-x-1/2 items-center gap-2 rounded-full border border-[#D4A24C]/30 bg-[#171B2E] py-1.5 pl-1.5 pr-3.5 shadow-lg shadow-black/20">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#D4A24C]/15">
          <span className="h-2 w-2 rounded-full bg-[#D4A24C]" />
        </span>
        <span className="font-['IBM_Plex_Mono'] text-[11px] text-[#EDEFF5]">held in memory</span>
      </div>

      {/* node 3 */}
      <div className="absolute right-0 top-[122px] flex items-center gap-2 rounded-full border border-[#D4A24C]/40 bg-[#D4A24C] py-1.5 pl-1.5 pr-3.5 shadow-lg shadow-[#D4A24C]/20">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0F1220]/15">
          <Check className="h-3 w-3 text-[#0F1220]" strokeWidth={2.5} />
        </span>
        <span className="font-['IBM_Plex_Mono'] text-[11px] text-[#0F1220]">reminded, Fri 9am</span>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const goToSignup = () => navigate("/signup");
  const goToLogin = () => navigate("/login");

  const scrollToHowItWorks = () => {
    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#0F1220] text-[#EDEFF5]">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#0F1220]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <span className="font-['Space_Grotesk'] text-[18px] font-medium">Memora</span>

          <nav className="hidden items-center gap-8 sm:flex">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} className="text-sm text-[#8A8FA3] transition-colors hover:text-[#EDEFF5]">
                {l.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 sm:flex">
            <button onClick={goToLogin} className="text-sm text-[#8A8FA3] transition-colors hover:text-[#EDEFF5]">
              Sign in
            </button>
            <button
              onClick={goToSignup}
              className="rounded-full bg-[#D4A24C] px-4 py-2 text-sm font-medium text-[#0F1220] transition-transform hover:scale-[1.03]"
            >
              Start free
            </button>
          </div>

          <button className="text-[#EDEFF5] sm:hidden" onClick={() => setMenuOpen((v) => !v)} aria-label="Menu">
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-white/[0.06] px-5 pb-5 pt-2 sm:hidden">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className="block py-2.5 text-sm text-[#8A8FA3]"
              >
                {l.label}
              </a>
            ))}
            <button onClick={goToLogin} className="block w-full py-2.5 text-left text-sm text-[#8A8FA3]">
              Sign in
            </button>
            <button
              onClick={goToSignup}
              className="mt-3 w-full rounded-full bg-[#D4A24C] py-2.5 text-sm font-medium text-[#0F1220]"
            >
              Start free
            </button>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-5 pb-6 pt-14 text-center sm:px-8 sm:pt-20">
        <span className="inline-block rounded-full border border-white/10 px-3.5 py-1 text-xs text-[#8A8FA3]">
          For people who say "I'll get to it" and mean it
        </span>
        <h1 className="mt-6 font-['Space_Grotesk'] text-[34px] font-medium leading-[1.12] tracking-tight sm:text-[52px]">
          You didn't forget.
          <br />
          <span className="text-[#D4A24C]">It just went untracked.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-lg text-[16px] leading-relaxed text-[#8A8FA3] sm:text-[17px]">
          Memora reads across your email, chats, and docs, finds the promises
          you've made, and reminds you before you break them -- not after.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            onClick={goToSignup}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#D4A24C] px-6 py-3.5 text-sm font-medium text-[#0F1220] transition-transform hover:scale-[1.02] sm:w-auto"
          >
            Start remembering -- it's free
            <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
          </button>
          <button
            onClick={scrollToHowItWorks}
            className="w-full rounded-full border border-white/10 px-6 py-3.5 text-sm text-[#EDEFF5] transition-colors hover:border-white/25 sm:w-auto"
          >
            See how it works
          </button>
        </div>
      </section>

      {/* Thread hero visual */}
      <ThreadHero />

      {/* Problem statement */}
      <section className="mx-auto mt-24 max-w-4xl px-5 sm:px-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {[
            { q: "\u201cWhere did I save that file?\u201d", a: "Buried in a Drive folder from three weeks ago." },
            { q: "\u201cDid I already pay this?\u201d", a: "Nobody's sure -- the receipt is in an inbox nobody checks." },
            { q: "\u201cWhat did I agree to?\u201d", a: "Said out loud in a call, written down nowhere." },
          ].map((item) => (
            <div key={item.q} className="rounded-2xl border border-white/[0.06] bg-[#171B2E] p-5">
              <p className="font-['Space_Grotesk'] text-[15px] text-[#EDEFF5]">{item.q}</p>
              <p className="mt-2 text-sm leading-relaxed text-[#8A8FA3]">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto mt-28 max-w-5xl px-5 sm:px-8">
        <div className="max-w-lg">
          <h2 className="font-['Space_Grotesk'] text-[28px] font-medium leading-tight sm:text-[34px]">
            Three ways it holds what you'd otherwise drop.
          </h2>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {CAPABILITIES.map((cap, i) => (
            <div key={cap.title} className="relative rounded-2xl border border-white/[0.06] bg-[#171B2E] p-6">
              <span className="font-['IBM_Plex_Mono'] text-xs text-[#D4A24C]">0{i + 1}</span>
              <h3 className="mt-3 font-['Space_Grotesk'] text-[17px] font-medium text-[#EDEFF5]">
                {cap.title}
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-[#8A8FA3]">{cap.desc}</p>
              <div className="mt-4 rounded-lg border border-white/[0.06] bg-[#0F1220] px-3 py-2.5">
                <p className="font-['IBM_Plex_Mono'] text-[11px] text-[#5EC8B8]">{cap.example}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Connects to */}
      <section id="connects" className="mx-auto mt-28 max-w-4xl px-5 text-center sm:px-8">
        <h2 className="font-['Space_Grotesk'] text-[24px] font-medium sm:text-[28px]">
          One memory, wherever you left it
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-[#8A8FA3]">
          Memora connects to the tools you already use -- nothing to migrate, nothing new to check.
        </p>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SOURCES.map((s) => (
            <div key={s.name} className="flex flex-col items-center gap-2.5 rounded-xl border border-white/[0.06] bg-[#171B2E] px-4 py-6">
              <s.icon className="h-5 w-5 text-[#8A8FA3]" strokeWidth={1.5} />
              <span className="text-xs text-[#8A8FA3]">{s.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto mt-28 max-w-3xl px-5 sm:px-8">
        <div className="text-center">
          <h2 className="font-['Space_Grotesk'] text-[24px] font-medium sm:text-[28px]">
            Start free. Upgrade when it's earned its keep.
          </h2>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl border p-6 ${
                plan.highlighted
                  ? "border-[#D4A24C]/40 bg-[#1F2440]"
                  : "border-white/[0.06] bg-[#171B2E]"
              }`}
            >
              {plan.highlighted && (
                <span className="inline-block rounded-full bg-[#D4A24C]/15 px-2.5 py-1 text-[11px] font-medium text-[#D4A24C]">
                  Most chosen
                </span>
              )}
              <h3 className="mt-3 font-['Space_Grotesk'] text-[18px] font-medium">{plan.name}</h3>
              <p className="mt-1 text-sm text-[#8A8FA3]">{plan.desc}</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="font-['IBM_Plex_Mono'] text-[32px] text-[#EDEFF5]">{plan.price}</span>
                <span className="text-sm text-[#8A8FA3]">{plan.period}</span>
              </div>
              <ul className="mt-5 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-[#EDEFF5]/90">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#5EC8B8]" strokeWidth={2.25} />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={goToSignup}
                className={`mt-6 w-full rounded-full py-3 text-sm font-medium transition-transform hover:scale-[1.02] ${
                  plan.highlighted ? "bg-[#D4A24C] text-[#0F1220]" : "border border-white/10 text-[#EDEFF5]"
                }`}
              >
                Choose {plan.name}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto mt-28 max-w-2xl px-5 pb-10 text-center sm:px-8">
        <h2 className="font-['Space_Grotesk'] text-[26px] font-medium leading-tight sm:text-[32px]">
          Say it once. Memora holds the rest.
        </h2>
        <button
          onClick={goToSignup}
          className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#D4A24C] px-7 py-3.5 text-sm font-medium text-[#0F1220] transition-transform hover:scale-[1.03]"
        >
          Start free
          <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
        </button>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <span className="font-['Space_Grotesk'] text-sm text-[#8A8FA3]">Memora</span>
          <p className="text-xs text-[#8A8FA3]">&copy; {new Date().getFullYear()} Memora. Your memory stays yours.</p>
        </div>
      </footer>
    </div>
  );
}