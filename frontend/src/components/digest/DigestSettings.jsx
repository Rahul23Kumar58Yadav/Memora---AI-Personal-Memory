import React, { useState } from "react";
import { Bell, Clock, Mail, Smartphone } from "lucide-react";

// ----------------------------------------------------------------------
// Memora — DigestSettings
// Reusable digest-preferences block — used inside SettingsPage, and
// could equally sit in an onboarding step. Self-contained state with an
// onChange callback so the parent decides when/how to persist.
//
// Props:
//   initial?: {
//     enabled, time, channel: "email" | "push" | "both",
//     staleReminders
//   }
//   onChange(prefs): void   — fired whenever any field changes
// ----------------------------------------------------------------------

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        checked ? "bg-[#D4A24C]" : "bg-white/[0.12]"
      } ${disabled ? "opacity-40" : ""}`}
      aria-pressed={checked}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-[#0F1220] transition-transform ${
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

const CHANNELS = [
  { key: "email", label: "Email", icon: Mail },
  { key: "push", label: "Push", icon: Smartphone },
  { key: "both", label: "Both", icon: Bell },
];

export default function DigestSettings({
  initial = { enabled: true, time: "08:00", channel: "push", staleReminders: true },
  onChange,
}) {
  const [prefs, setPrefs] = useState(initial);

  const update = (patch) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    onChange?.(next);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#171B2E]">
      {/* Enable */}
      <div className="flex items-center justify-between gap-4 border-b border-white/[0.06] px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.05]">
            <Bell className="h-4 w-4 text-[#8A8FA3]" strokeWidth={1.75} />
          </span>
          <div>
            <p className="text-[14px] text-[#EDEFF5]">Daily digest</p>
            <p className="mt-0.5 text-xs text-[#8A8FA3]">A morning summary of what's due and fading</p>
          </div>
        </div>
        <Toggle checked={prefs.enabled} onChange={(v) => update({ enabled: v })} />
      </div>

      {/* Time */}
      <div className="flex items-center justify-between gap-4 border-b border-white/[0.06] px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.05]">
            <Clock className="h-4 w-4 text-[#8A8FA3]" strokeWidth={1.75} />
          </span>
          <div>
            <p className="text-[14px] text-[#EDEFF5]">Delivery time</p>
            <p className="mt-0.5 text-xs text-[#8A8FA3]">Sent every day at this time</p>
          </div>
        </div>
        <input
          type="time"
          value={prefs.time}
          onChange={(e) => update({ time: e.target.value })}
          disabled={!prefs.enabled}
          className="rounded-lg border border-white/[0.08] bg-[#0F1220] px-2.5 py-1.5 font-['IBM_Plex_Mono'] text-xs text-[#EDEFF5] disabled:opacity-40"
        />
      </div>

      {/* Channel */}
      <div className="border-b border-white/[0.06] px-5 py-4">
        <p className="text-[14px] text-[#EDEFF5]">Delivery channel</p>
        <div className={`mt-3 flex gap-2 ${!prefs.enabled ? "opacity-40" : ""}`}>
          {CHANNELS.map(({ key, label, icon: Icon }) => {
            const active = prefs.channel === key;
            return (
              <button
                key={key}
                disabled={!prefs.enabled}
                onClick={() => update({ channel: key })}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-medium transition-colors ${
                  active
                    ? "border-[#D4A24C]/40 bg-[#D4A24C]/10 text-[#D4A24C]"
                    : "border-white/[0.08] text-[#8A8FA3] hover:text-[#EDEFF5]"
                }`}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stale reminders */}
      <div className="flex items-center justify-between gap-4 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.05]">
            <Bell className="h-4 w-4 text-[#8A8FA3]" strokeWidth={1.75} />
          </span>
          <div>
            <p className="text-[14px] text-[#EDEFF5]">Nudge on fading commitments</p>
            <p className="mt-0.5 text-xs text-[#8A8FA3]">Include promises with no deadline that are going stale</p>
          </div>
        </div>
        <Toggle
          checked={prefs.staleReminders}
          onChange={(v) => update({ staleReminders: v })}
          disabled={!prefs.enabled}
        />
      </div>
    </div>
  );
}