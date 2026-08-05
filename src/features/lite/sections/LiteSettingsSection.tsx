import Link from "next/link";
import { Building2, CircleHelp, Plug, ScrollText, User, Wallet, type LucideIcon } from "lucide-react";

// XL-2 (2026-08-05): Settings is the fold-in point for the navigation contract's sub-items
// ("Profile, Organization, Integrations, Billing, Audit Export" plus Help & Support, per
// docs/readiness/AXXESS_LITE_PRODUCTION_SCOPE_AND_NAVIGATION_CONTRACT_2026_08_05.md Section 6) --
// deliberately NOT src/features/settings/SettingsSection.tsx (X0's full admin console: deep RBAC,
// Agent Connections/MCP admin, the 28-entry connector catalogue, demo controls). Billing and
// Help & Support reuse the real routes already built in XL-1 rather than duplicating their
// content; the rest are honest "coming soon" rows, not fabricated settings screens.
type SettingsRow = { label: string; description: string; icon: LucideIcon; href?: string };

const rows: SettingsRow[] = [
  { label: "Profile", description: "Your name, email, and preferences.", icon: User },
  { label: "Organization", description: "Your business name and details.", icon: Building2 },
  { label: "Integrations", description: "Connect the tools you already use (a short, practical list -- not the full catalogue).", icon: Plug },
  { label: "Billing", description: "Your plan and billing status.", icon: Wallet, href: "/lite/payments" },
  { label: "Audit Export", description: "Download a simple activity log as PDF or ZIP.", icon: ScrollText },
  { label: "Help & Support", description: "Get help or send feedback.", icon: CircleHelp, href: "/lite/help" },
];

export function LiteSettingsSection() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-3">
      <div>
        <h1 className="text-sm font-semibold text-[#0F1117]">Settings</h1>
        <p className="mt-0.5 text-xs text-[#5F6B73]">Account, organization, and plan.</p>
      </div>
      <div className="overflow-hidden rounded-xl border border-[rgba(0,0,0,0.06)] bg-white">
        {rows.map((row) => {
          const content = (
            <div className="flex items-start gap-3 px-4 py-3">
              <row.icon size={16} className="mt-0.5 flex-shrink-0 text-[#8B1E2D]" />
              <div>
                <p className="text-xs font-semibold text-[#0F1117]">{row.label}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-[#5F6B73]">{row.description}</p>
                {!row.href && <p className="mt-1 text-[10px] text-[#5F6B73]">Coming soon.</p>}
              </div>
            </div>
          );
          return row.href ? (
            <Link key={row.label} href={row.href} className="block border-b border-[rgba(0,0,0,0.04)] last:border-b-0 hover:bg-[#F8F9FA]">
              {content}
            </Link>
          ) : (
            <div key={row.label} className="border-b border-[rgba(0,0,0,0.04)] last:border-b-0">
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
