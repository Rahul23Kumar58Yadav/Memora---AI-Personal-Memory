import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Bell, Shield, Trash2, ChevronRight, Mail, Smartphone } from "lucide-react";
import DigestSettings from "../components/digest/DigestSettings";
import { useAuth } from "../hooks/useAuth";
import { useDigest } from "../hooks/useDigest";
import { ROUTES } from "../utils/constants";

// ----------------------------------------------------------------------
// Memora — SettingsPage (refactored)
// Was previously ~180 lines with five local useState calls duplicating
// what DigestSettings.jsx now owns, and hardcoded profile data. Now:
//   - useAuth() supplies the real signed-in user for the Profile row
//   - useDigest() supplies real settings + updateSettings (optimistic,
//     with rollback) to <DigestSettings />
//   - Push/Email notification toggles simplified into DigestSettings'
//     own channel picker (Email / Push / Both) rather than two separate,
//     easy-to-desync toggles
// ----------------------------------------------------------------------

function SettingsSection({ title, children }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-[#8A8FA3]">{title}</h2>
      <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#171B2E]">
        {children}
      </div>
    </section>
  );
}

function Row({ icon: Icon, label, sub, right, onClick, danger }) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-4 border-b border-white/[0.06] px-4 py-4 text-left last:border-0 sm:px-5 ${
        onClick ? "transition-colors hover:bg-white/[0.03]" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        {Icon && (
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${danger ? "bg-[#E8637A]/10" : "bg-white/[0.05]"}`}>
            <Icon className={`h-4 w-4 ${danger ? "text-[#E8637A]" : "text-[#8A8FA3]"}`} strokeWidth={1.75} />
          </span>
        )}
        <div className="min-w-0">
          <p className={`text-[14px] ${danger ? "text-[#E8637A]" : "text-[#EDEFF5]"}`}>{label}</p>
          {sub && <p className="mt-0.5 truncate text-xs text-[#8A8FA3]">{sub}</p>}
        </div>
      </div>
      <div className="shrink-0">{right}</div>
    </Comp>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings, isLoading, updateSettings } = useDigest();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const handleDeleteAccount = () => {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    // TODO: call authApi.deleteAccount() then log out + redirect to "/"
  };

  return (
    <div className="min-h-screen bg-[#0F1220] pb-24 sm:pb-10">
      <header className="border-b border-white/[0.06] px-4 pb-5 pt-6 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <h1 className="font-['Space_Grotesk'] text-[22px] font-medium text-[#EDEFF5] sm:text-[26px]">
            Settings
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pt-6 sm:px-6">
        {/* Profile */}
        <SettingsSection title="Profile">
          <Row
            icon={User}
            label={user?.name || "Your profile"}
            sub={user?.email}
            right={<ChevronRight className="h-4 w-4 text-[#8A8FA3]" strokeWidth={1.75} />}
            onClick={() => navigate(`${ROUTES.SETTINGS}/profile`)}
          />
        </SettingsSection>

        {/* Digest — now a single reusable block instead of 3 local useStates */}
        <section className="mb-8">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-[#8A8FA3]">
            Daily digest
          </h2>
          {isLoading ? (
            <div className="h-[220px] animate-pulse rounded-2xl border border-white/[0.06] bg-[#171B2E]" />
          ) : (
            <DigestSettings initial={settings} onChange={updateSettings} />
          )}
        </section>

        {/* Privacy */}
        <SettingsSection title="Data & privacy">
          <Row
            icon={Shield}
            label="Manage connections"
            sub="See exactly what Memora can read"
            right={<ChevronRight className="h-4 w-4 text-[#8A8FA3]" strokeWidth={1.75} />}
            onClick={() => navigate(ROUTES.CONNECTIONS)}
          />
          <Row
            icon={Shield}
            label="Export my data"
            sub="Download everything Memora has indexed"
            right={<ChevronRight className="h-4 w-4 text-[#8A8FA3]" strokeWidth={1.75} />}
            onClick={() => {
              // TODO: call a real export endpoint, e.g. settingsApi.exportData()
            }}
          />
        </SettingsSection>

        {/* Danger zone */}
        <SettingsSection title="Danger zone">
          <Row
            icon={Trash2}
            label={confirmingDelete ? "Tap again to permanently delete" : "Delete account"}
            sub="Permanently erases your account and everything indexed"
            danger
            right={<ChevronRight className="h-4 w-4 text-[#E8637A]" strokeWidth={1.75} />}
            onClick={handleDeleteAccount}
          />
        </SettingsSection>
      </main>
    </div>
  );
}