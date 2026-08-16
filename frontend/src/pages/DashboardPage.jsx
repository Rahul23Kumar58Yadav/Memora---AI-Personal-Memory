import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Flame,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  MessageSquare,
  ChevronRight,
} from "lucide-react";
import CommitmentCard from "../components/commitments/CommitmentCard";
import { useAuth } from "../hooks/useAuth";
import { useCommitments } from "../hooks/useCommitments";

// ----------------------------------------------------------------------
// Memora -- Dashboard (now dynamic)
// Was previously hardcoded MOCK_COMMITMENTS + a fake stats object.
// Now pulls real data via useCommitments() -- the same hook
// CommitmentsPage.jsx already uses -- filtered to "all" active items,
// and reuses the same CommitmentCard component so this page and the
// full Commitments list never visually drift apart.
// ----------------------------------------------------------------------

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { items, summary, isLoading, error, markKept } = useCommitments({ status: "all" });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = user?.name?.split(" ")[0] || "there";

  // Show the top few active (not-yet-kept) items on the thread --
  // "View all" links to the full Commitments page for everything else.
  const threadItems = items.filter((it) => it.urgency !== "kept" && it.urgency !== "dismissed").slice(0, 5);

  return (
    <div className="min-h-screen bg-[#0F1220] pb-24 sm:pb-10">
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#0F1220]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <p className="font-['Space_Grotesk'] text-[17px] font-medium text-[#EDEFF5]">Memora</p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6">
        {/* Greeting */}
        <div className="pt-7 sm:pt-9">
          <h1 className="font-['Space_Grotesk'] text-[26px] font-medium leading-tight text-[#EDEFF5] sm:text-[32px]">
            {greeting}, {firstName}.
          </h1>
          <p className="mt-1.5 text-[15px] text-[#8A8FA3]">
            {summary.overdue > 0
              ? `${summary.overdue} thing${summary.overdue > 1 ? "s" : ""} slipped past due -- worth a look.`
              : "Nothing's overdue. You're holding steady."}
          </p>
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-[#E8637A]/25 bg-[#E8637A]/10 px-3.5 py-2.5 text-sm text-[#E8637A]">
            {error}
          </p>
        )}

        {/* Stats row -- real counts from GET /commitments/summary */}
        <div className="mt-6 grid grid-cols-3 gap-3 sm:gap-4">
          <StatCard
            icon={AlertTriangle}
            label="Overdue"
            value={isLoading ? "–" : summary.overdue}
            accent={{ bg: "bg-[#E8637A]/10", text: "text-[#E8637A]" }}
          />
          <StatCard
            icon={Clock}
            label="Due today"
            value={isLoading ? "–" : summary.today}
            accent={{ bg: "bg-[#D4A24C]/10", text: "text-[#D4A24C]" }}
          />
          <StatCard
            icon={CheckCircle2}
            label="Kept this month"
            value={isLoading ? "–" : summary.keptThisMonth}
            accent={{ bg: "bg-[#5EC8B8]/10", text: "text-[#5EC8B8]" }}
          />
        </div>

        {/* Thread */}
        <div className="mt-9 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-[#D4A24C]" strokeWidth={2} />
            <h2 className="font-['Space_Grotesk'] text-[15px] font-medium text-[#EDEFF5]">
              What you're holding right now
            </h2>
          </div>
          <button
            onClick={() => navigate("/commitments")}
            className="flex items-center gap-1 text-xs text-[#8A8FA3] transition-colors hover:text-[#EDEFF5]"
          >
            View all
            <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>

        <div className="mt-5">
          {isLoading ? (
            <div className="space-y-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-[74px] animate-pulse rounded-xl border border-white/[0.06] bg-[#171B2E]" />
              ))}
            </div>
          ) : threadItems.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center">
              <Sparkles className="h-6 w-6 text-[#8A8FA3]" strokeWidth={1.5} />
              <p className="mt-3 text-sm text-[#8A8FA3]">
                Nothing tracked yet. Connect an account and Memora will start listening for what you promise.
              </p>
              <button
                onClick={() => navigate("/connections")}
                className="mt-4 rounded-full bg-[#D4A24C] px-4 py-2 text-xs font-medium text-[#0F1220]"
              >
                Connect an account
              </button>
            </div>
          ) : (
            <div>
              {threadItems.map((item, i) => (
                <CommitmentCard
                  key={item.id}
                  item={item}
                  onSelect={() => navigate("/commitments")}
                  onToggleKept={markKept}
                  showThread
                  isLast={i === threadItems.length - 1}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Floating ask button -- desktop */}
      <button
        onClick={() => navigate("/chat")}
        className="fixed bottom-8 right-8 hidden items-center gap-2 rounded-full bg-[#D4A24C] px-5 py-3.5 font-medium text-[#0F1220] shadow-lg shadow-[#D4A24C]/20 transition-transform hover:scale-[1.03] sm:flex"
      >
        <MessageSquare className="h-4 w-4" strokeWidth={2.25} />
        Ask Memora
      </button>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-[#171B2E] px-4 py-4 sm:px-5 sm:py-5">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accent.bg}`}>
        <Icon className={`h-5 w-5 ${accent.text}`} strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="font-['IBM_Plex_Mono'] text-2xl leading-none text-[#EDEFF5] tabular-nums">{value}</p>
        <p className="mt-1 truncate text-xs text-[#8A8FA3]">{label}</p>
      </div>
    </div>
  );
}