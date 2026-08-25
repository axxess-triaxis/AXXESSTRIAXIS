import { BellRing, Blocks, Book, Brain, CalendarDays, CheckSquare, ClipboardCheck, FolderKanban, Home, Settings, Users, type LucideIcon } from "lucide-react";
import type { NavSection } from "../../app/navigation";

// MN-1 (2026-08-23): the explicit include/exclude contract from
// docs/readiness/MOBILE_NATIVE_CAPACITOR_RESEARCH_AND_ROADMAP_2026_08_23.md's "Mobile Surface
// Contract" section, made real and testable. Everything listed there as "Include In X0 Mobile" has
// an entry here; nothing on the "Exclude From X0 Mobile" list does (mobileIsolation.test.ts asserts
// this file and the rest of src/features/mobile never import any of the excluded modules at all).
export type MobileFeatureId =
  | "home" | "tasks" | "reminders" | "meetings" | "projects"
  | "approvals" | "knowledge" | "ai-workspace" | "stakeholders" | "settings";

export type MobileFeatureEntry = {
  id: MobileFeatureId;
  label: string;
  icon: LucideIcon;
  // "home" has no `section` -- MobileShell renders it as a local, real (not fabricated) quick-link
  // panel rather than routing to the existing "dashboard" NavSection, since that section renders
  // the Full Executive Dashboard, which is explicitly excluded from mobile. A dedicated Command
  // Home screen with its own real data is MN-2 scope (roadmap's own "MN-2 -- Core Mobile Workflows"
  // section lists "Command Home" as an MN-2 output, not MN-1's).
  section?: NavSection;
  // Shown directly in the bottom tab bar. The remaining entries surface under the "More" tab --
  // five fixed bottom-tab slots (Home, Tasks, Approvals, Ask AI, More) matches the bottom-navigation
  // pattern the roadmap's own research cites (Salesforce Mobile, ServiceNow Now Mobile), not an
  // arbitrary cut; every entry is still in this registry and still reachable, tested, and real.
  primaryTab?: boolean;
};

export const mobileFeatureRegistry: MobileFeatureEntry[] = [
  { id: "home", label: "Today", icon: Home, primaryTab: true },
  { id: "tasks", label: "Tasks", icon: CheckSquare, section: "tasks", primaryTab: true },
  { id: "approvals", label: "Approvals", icon: ClipboardCheck, section: "approvals", primaryTab: true },
  { id: "ai-workspace", label: "Ask AI", icon: Brain, section: "ai-workspace", primaryTab: true },
  { id: "meetings", label: "Meetings", icon: CalendarDays, section: "meetings" },
  // Reminders intentionally reuses the Tasks route rather than getting its own screen -- the
  // roadmap's own Mobile Surface Contract already resolves this: "Reminders can be created/edited
  // or represented through task due dates." No separate reminders data model exists to route to.
  { id: "reminders", label: "Reminders", icon: BellRing, section: "tasks" },
  { id: "projects", label: "Projects", icon: FolderKanban, section: "projects" },
  { id: "knowledge", label: "Knowledge Hub", icon: Book, section: "knowledge" },
  { id: "stakeholders", label: "CRM Notes", icon: Users, section: "stakeholders" },
  { id: "settings", label: "Settings", icon: Settings, section: "settings" },
];

export const mobilePrimaryTabs = mobileFeatureRegistry.filter((entry) => entry.primaryTab);
export const mobileMoreItems = mobileFeatureRegistry.filter((entry) => !entry.primaryTab && entry.id !== "home");

export function mobileFeatureForSection(section: NavSection): MobileFeatureEntry | undefined {
  return mobileFeatureRegistry.find((entry) => entry.section === section);
}

// A generic "..." icon for the More tab itself -- not a registry entry (it has no section/route of
// its own, it's a local panel like Home), so it isn't part of mobileFeatureRegistry above.
export const mobileMoreTabIcon: LucideIcon = Blocks;
