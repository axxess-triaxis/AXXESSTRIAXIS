import { CalendarDays, CheckSquare, FileStack, FolderKanban, Home, MessagesSquare, Settings as SettingsIcon, Users } from "lucide-react";

// XL-1 (2026-08-05): AXXESS Lite's own navigation manifest -- deliberately NOT derived from, or
// filtered out of, src/app/routing/routes.ts (appRoutes). appRoutes is X0's registry and drives
// X0's App.tsx shell; keeping Lite's list separate and independently authored means an X0-only
// admin route can never leak into Lite by a filtering bug. See
// docs/readiness/AXXESS_LITE_DOCTRINE_AND_SURFACE_CONSTITUTION_2026_08_05.md Section 5.
//
// XL-2 (2026-08-05): rebuilt to the founder-approved production navigation contract -- Option A,
// 8 top-level items (see docs/readiness/AXXESS_LITE_PRODUCTION_SCOPE_AND_NAVIGATION_CONTRACT_2026_08_05.md
// Section 6 for the recommendation and reasoning). Was 7 items in XL-1 (Home, Work, Files, People,
// Ask AXXESS, Payments, Help); "Payments" and "Help" are no longer top-level nav entries -- they
// fold into Settings (see the Settings item's subItems) as the contract's Settings sub-items list
// requires ("Profile, Organization, Integrations, Billing, Audit Export") plus Help & Support,
// which the founder's own Section 9 feature interpretation separately named as an allowed Settings
// item. The XL-1 route files at /lite/payments and /lite/help were NOT deleted -- Settings links
// to them rather than duplicating their content, per this program's "prefer reusing over rebuilding"
// soft constraint. "Meetings" and "Projects" are newly promoted to top-level per the contract.
//
// XL-5 (2026-08-06): moved here from src/features/lite/liteNavigation.ts -- Phase 1 of the
// shared-core extraction (docs/readiness/AXXESS_LITE_SHARED_CORE_EXTRACTION_PLAN_2026_08_06.md).
// This module has zero framework/auth/root-app dependencies (only the third-party lucide-react
// icon library), making it a genuinely low-risk first move. The old location now re-exports from
// here so every existing consumer (LiteShell.tsx, LiteHomeSection.tsx) keeps working unchanged.
export type LiteSection = "home" | "work" | "meetings" | "projects" | "people" | "files" | "ask" | "settings";

// Hard cap from the navigation contract: "Do not exceed 10 top-level nav items without founder
// approval." Enforced by a test (liteNavigation.test.ts), not just this comment.
export const liteTopLevelNavLimit = 10;

export type LiteNavItem = {
  id: LiteSection;
  label: string;
  path: string;
  icon: typeof Home;
  description: string;
  // Documented sub-areas per the navigation contract -- not all are separately routed yet. Where a
  // sub-item has its own real page today, its own liteNavItems-independent route already exists
  // (Settings' "Billing" -> /lite/payments, "Help & Support" -> /lite/help); the rest are honest
  // "coming soon" rows on the parent page (see LiteSettingsSection.tsx), not fabricated features.
  subItems?: string[];
};

export const liteNavItems: LiteNavItem[] = [
  { id: "home", label: "Home", path: "/lite", icon: Home, description: "A quick look at what needs your attention." },
  { id: "work", label: "Work", path: "/lite/work", icon: CheckSquare, description: "Tasks and things to follow up on.", subItems: ["Tasks", "Reminders", "Approvals"] },
  { id: "meetings", label: "Meetings", path: "/lite/meetings", icon: CalendarDays, description: "Meetings, decisions, and follow-ups." },
  { id: "projects", label: "Projects", path: "/lite/projects", icon: FolderKanban, description: "Track your projects and programs.", subItems: ["Projects", "Programs"] },
  { id: "people", label: "People", path: "/lite/people", icon: Users, description: "Customers, vendors, and contacts.", subItems: ["CRM", "Stakeholders"] },
  { id: "files", label: "Files", path: "/lite/files", icon: FileStack, description: "Documents and notes you've saved.", subItems: ["Documents", "Knowledge Hub"] },
  { id: "ask", label: "Ask AXXESS", path: "/lite/ask", icon: MessagesSquare, description: "Ask questions about your own files." },
  { id: "settings", label: "Settings", path: "/lite/settings", icon: SettingsIcon, description: "Account, organization, and plan.", subItems: ["Profile", "Organization", "Integrations", "Billing", "Audit Export", "Help & Support"] },
];

export function liteNavItemForPath(pathname: string): LiteNavItem | undefined {
  return liteNavItems.find((item) => item.path === pathname);
}
