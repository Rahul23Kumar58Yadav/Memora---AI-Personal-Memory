import React from "react";
import { ArrowLeft, Search } from "lucide-react";

// ----------------------------------------------------------------------
// Memora — 404
// The thread visual, deliberately broken — a small, on-brand way to say
// "this one didn't get tracked" without being cute about it.
// ----------------------------------------------------------------------

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0F1220] px-6 text-center">
      <a href="/" className="absolute left-5 top-6 font-['Space_Grotesk'] text-[18px] font-medium text-[#EDEFF5] sm:left-8">
        Memora
      </a>

      {/* broken thread */}
      <svg viewBox="0 0 240 60" className="w-52 opacity-80">
        <path d="M10 30 C 60 30, 70 10, 100 10" stroke="#D4A24C" strokeWidth="1.5" strokeDasharray="4 5" fill="none" />
        <path d="M140 50 C 170 50, 180 30, 230 30" stroke="#8A8FA3" strokeWidth="1.5" strokeDasharray="4 5" fill="none" />
        <circle cx="100" cy="10" r="4" fill="#D4A24C" />
        <circle cx="140" cy="50" r="4" fill="#8A8FA3" fillOpacity="0.5" />
      </svg>

      <p className="mt-6 font-['IBM_Plex_Mono'] text-sm text-[#8A8FA3]">404</p>
      <h1 className="mt-2 font-['Space_Grotesk'] text-[26px] font-medium text-[#EDEFF5] sm:text-[30px]">
        This thread doesn't connect to anything.
      </h1>
      <p className="mx-auto mt-2.5 max-w-sm text-[15px] leading-relaxed text-[#8A8FA3]">
        The page you're looking for isn't tracked anywhere in Memora. It may have moved, or never existed.
      </p>

      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
        <a
          href="/"
          className="flex w-full items-center justify-center gap-2 rounded-full bg-[#D4A24C] px-6 py-3 text-sm font-medium text-[#0F1220] transition-transform hover:scale-[1.02] sm:w-auto"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2.25} />
          Back to dashboard
        </a>
        <a
          href="/chat"
          className="flex w-full items-center justify-center gap-2 rounded-full border border-white/10 px-6 py-3 text-sm text-[#EDEFF5] transition-colors hover:border-white/25 sm:w-auto"
        >
          <Search className="h-4 w-4" strokeWidth={1.75} />
          Ask Memora instead
        </a>
      </div>
    </div>
  );
}