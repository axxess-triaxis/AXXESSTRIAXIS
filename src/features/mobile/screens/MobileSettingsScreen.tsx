"use client";

import { useState } from "react";
import { Building2, ChevronRight, Settings as SettingsIcon, UserPlus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRegisterMobileBackHandler } from "../MobileBackHandlerContext";
import { useMobileTabletLayout } from "../useMobileTabletLayout";
import { MobileSettingsProfilePanel } from "./MobileSettingsProfilePanel";
import { MobileSettingsOrganizationPanel } from "./MobileSettingsOrganizationPanel";
import { MobileSettingsTeamPanel } from "./MobileSettingsTeamPanel";

type SettingsPanelId = "profile" | "organization" | "team";

const rows: { id: SettingsPanelId; label: string; icon: LucideIcon; description: string }[] = [
  { id: "profile", label: "Profile", icon: SettingsIcon, description: "Your account, phone sign-in, AI prompts" },
  { id: "organization", label: "Organization", icon: Building2, description: "Tenant details, projects, documents" },
  { id: "team", label: "Team & Access", icon: UserPlus, description: "Manage users, roles, invitations" },
];

// MN-7 (2026-08-24): the real native Settings screen -- replaces the reused desktop
// SettingsSection fallback (docs/readiness/ANDROID_BETA_0_9_V3_WALKTHROUGH_TRIAGE_2026_08_24.md,
// items 5/9). List/drill-down on phone, side-by-side on tablet, matching every other MN-2 native
// screen's shape (see MobileTasksScreen.tsx). No Permissions row -- item 11 approved dropping it
// entirely from mobile (it was always a static, read-only reference table with no registry
// entry of its own on this shell; desktop keeps it unchanged).
export function MobileSettingsScreen() {
  const [panel, setPanel] = useState<SettingsPanelId | null>(null);
  const isTablet = useMobileTabletLayout();

  useRegisterMobileBackHandler(() => {
    if (!isTablet && panel) {
      setPanel(null);
      return true;
    }
    return false;
  });

  const listPanel = (
    <div className="flex flex-col px-4 py-3">
      <div className="divide-y divide-[rgba(15,17,23,0.06)] rounded-xl border border-[rgba(15,17,23,0.08)] bg-white">
        {rows.map((row) => (
          <button
            key={row.id}
            onClick={() => setPanel(row.id)}
            className={`flex min-h-[56px] w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#F8F9FA] ${panel === row.id && isTablet ? "bg-[#F8F9FA]" : ""}`}
          >
            <row.icon size={18} className="flex-shrink-0 text-[#8B1E2D]" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-[#0F1117]">{row.label}</span>
              <span className="block truncate text-[11px] text-[#5F6B73]">{row.description}</span>
            </span>
            <ChevronRight size={16} className="flex-shrink-0 text-[#5F6B73]" />
          </button>
        ))}
      </div>
    </div>
  );

  const detailPanel = panel === "profile" ? (
    <MobileSettingsProfilePanel />
  ) : panel === "organization" ? (
    <MobileSettingsOrganizationPanel />
  ) : panel === "team" ? (
    <MobileSettingsTeamPanel />
  ) : (
    <div className="px-4 py-8 text-center text-sm text-[#5F6B73]">Choose Profile, Organization, or Team &amp; Access.</div>
  );

  if (isTablet) {
    return (
      <div className="flex h-full">
        <div className="w-[42%] flex-shrink-0 overflow-y-auto border-r border-[rgba(0,0,0,0.06)]">{listPanel}</div>
        <div className="flex-1 overflow-y-auto">{detailPanel}</div>
      </div>
    );
  }

  if (panel) {
    return (
      <div>
        <button onClick={() => setPanel(null)} className="flex min-h-[44px] items-center px-4 text-xs font-semibold text-[#8B1E2D]">
          ← Back to Settings
        </button>
        {detailPanel}
      </div>
    );
  }

  return listPanel;
}
