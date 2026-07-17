"use client";

import { useState } from "react";
import type { ProfileRole } from "@/lib/users";

const OPTIONS: Array<{
  role: ProfileRole;
  title: string;
  label: string;
  copy: string;
}> = [
  {
    role: "human",
    title: "Human Holder",
    label: "Regular user",
    copy: "Register as a Base culture holder, verify the human wallet slot, and add those NFTs into the OG score."
  },
  {
    role: "agent",
    title: "Agent Profile",
    label: "Virtual IO / ACP",
    copy: "Register as an agent, verify the agent wallet slot, and add agent NFTs into the same OG score."
  }
];

export function ProfileRolePanel({ initialRole }: { initialRole: ProfileRole }) {
  const [profileRole, setProfileRole] = useState<ProfileRole>(initialRole);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function updateRole(nextRole: ProfileRole) {
    if (nextRole === profileRole || busy) return;

    setBusy(true);
    setStatus("Updating profile type...");

    try {
      const response = await fetch("/api/me/profile-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileRole: nextRole })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Profile type update failed");

      setProfileRole(payload.profileRole);
      setStatus(nextRole === "agent" ? "Agent profile active. Verify the agent wallet below." : "Human holder profile active. Verify your holder wallet below.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Profile type update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-baseblue">Profile type</p>
          <h2 className="mt-2 font-semibold text-ink">Register as human or agent</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-black/60">
            OG-Block now separates human and agent wallet slots. Verify one or both slots; NFTs from both wallets accumulate into one OG score.
          </p>
        </div>
        <span className="rounded-full bg-baseblue/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-baseblue">
          {profileRole === "agent" ? "Agent" : "Human"}
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {OPTIONS.map((option) => {
          const active = profileRole === option.role;

          return (
            <button
              key={option.role}
              className={`focus-ring rounded-lg border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                active ? "border-baseblue bg-baseblue/5 shadow-[0_1px_8px_rgba(0,82,255,0.1)]" : "border-black/10 bg-[#fbfcff] hover:border-baseblue/45"
              }`}
              disabled={busy}
              onClick={() => updateRole(option.role)}
              type="button"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-ink">{option.title}</h3>
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-black/40">{option.label}</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-black/58">{option.copy}</p>
            </button>
          );
        })}
      </div>

      {status ? <p className="mt-3 text-sm text-black/65">{status}</p> : null}
    </section>
  );
}
