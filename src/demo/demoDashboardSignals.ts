// A-91 (2026-08-03): the Executive Dashboard signal services added in ED-R2/ED-R3/ED-R4 (mail,
// CRM, social, calendar, external meetings, financial watch, Threads, Meta Business) have no
// demo-mode branch at all -- in Investor Preview (a pseudo-org with no real Supabase organization
// row and no real connector data), every one of them genuinely returns empty/not-connected, which
// is correct for a real tenant but reads as broken on the investor demo. Founder's explicit
// instruction: populate these with realistic, varied ("colorful," not all clean/green -- matching
// the existing seeded dataset's own "35 of 186 projects at risk" honesty) demo data on
// investor.triaxisventures.com only, leaving landing.triaxisventures.com's real empty-states
// untouched. This file is the single source of that data; each consuming hook checks
// isDemoModeEnabled() and short-circuits here instead of calling its real API route.
import type { CrmLead, FinancialWatchItem } from "../domain";
import type { MailDashboardSignals } from "../services/dashboard/mailDashboardSignals";
import type { SocialDashboardSignals } from "../services/dashboard/socialDashboardSignals";
import type { CalendarDashboardSignals } from "../services/dashboard/calendarDashboardSignals";
import type { ExternalMeetingsDashboardSignals } from "../services/dashboard/externalMeetingsDashboardSignals";
import type { ThreadsDashboardSignals } from "../services/dashboard/threadsDashboardSignals";
import type { MetaBusinessDashboardSignals } from "../services/dashboard/metaBusinessDashboardSignals";

const ORG_ID = "org_north_east_health_mission";

function daysAgoIso(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function daysFromNowIso(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

export const demoMailSignals: MailDashboardSignals = {
  gmailConnected: true,
  microsoftConnected: true,
  needingReplyCount: 6,
  oldestNeedingReplyDays: 3,
};

export const demoCrmLeads: CrmLead[] = [
  { id: "demo-lead-1", organizationId: ORG_ID, title: "District health department -- cold-chain grant", organizationName: "Assam Directorate of Health Services", contactName: "Dr. Meenakshi Bora", stage: "proposal", estimatedValue: 4200000, currency: "INR", priority: "high", nextFollowUpAt: daysAgoIso(1), status: "open", source: "referral", createdAt: daysAgoIso(21), updatedAt: daysAgoIso(1) },
  { id: "demo-lead-2", organizationId: ORG_ID, title: "Maternal health outreach -- Phase 2 renewal", organizationName: "UNICEF Regional Office", contactName: "Anjali Thakur", stage: "negotiation", estimatedValue: 6800000, currency: "INR", priority: "urgent", nextFollowUpAt: daysAgoIso(2), status: "open", source: "existing partner", createdAt: daysAgoIso(45), updatedAt: daysAgoIso(2) },
  { id: "demo-lead-3", organizationId: ORG_ID, title: "Tele-medicine pilot -- rural clinics", organizationName: "Meghalaya State Health Mission", contactName: "Ibansara Kharkongor", stage: "qualifying", estimatedValue: 1500000, currency: "INR", priority: "medium", nextFollowUpAt: daysFromNowIso(4), status: "open", source: "conference", createdAt: daysAgoIso(9), updatedAt: daysAgoIso(4) },
  { id: "demo-lead-4", organizationId: ORG_ID, title: "Nutrition supplement distribution -- Q3", organizationName: "World Food Programme India", contactName: "Rajiv Nair", stage: "new", estimatedValue: 2100000, currency: "INR", priority: "medium", nextFollowUpAt: daysFromNowIso(7), status: "open", source: "inbound", createdAt: daysAgoIso(3), updatedAt: daysAgoIso(3) },
  { id: "demo-lead-5", organizationId: ORG_ID, title: "Vaccine cold-storage upgrade -- 4 districts", organizationName: "Gavi Alliance", contactName: "Sarah Boehme", stage: "proposal", estimatedValue: 9500000, currency: "INR", priority: "urgent", nextFollowUpAt: daysAgoIso(1), status: "open", source: "referral", createdAt: daysAgoIso(30), updatedAt: daysAgoIso(1) },
  { id: "demo-lead-6", organizationId: ORG_ID, title: "Community health worker training -- Tripura", organizationName: "Tripura State Health Society", contactName: "Biplab Deb Barma", stage: "qualifying", estimatedValue: 980000, currency: "INR", priority: "low", nextFollowUpAt: daysFromNowIso(12), status: "open", source: "conference", createdAt: daysAgoIso(15), updatedAt: daysAgoIso(6) },
  { id: "demo-lead-7", organizationId: ORG_ID, title: "Mobile clinic expansion -- flood-prone blocks", organizationName: "Assam State Disaster Management Authority", contactName: "Pranjal Gogoi", stage: "negotiation", estimatedValue: 3400000, currency: "INR", priority: "high", status: "stalled", source: "referral", createdAt: daysAgoIso(60), updatedAt: daysAgoIso(18) },
  { id: "demo-lead-8", organizationId: ORG_ID, title: "Menstrual health awareness -- school program", organizationName: "Girl Rising India", contactName: "Priya Menon", stage: "proposal", estimatedValue: 620000, currency: "INR", priority: "low", status: "stalled", source: "inbound", createdAt: daysAgoIso(52), updatedAt: daysAgoIso(20) },
  { id: "demo-lead-9", organizationId: ORG_ID, title: "Diagnostic lab equipment -- Dibrugarh", organizationName: "National Health Mission Assam", contactName: "Dr. Kaustav Baruah", stage: "won", estimatedValue: 5100000, currency: "INR", priority: "medium", status: "won", source: "existing partner", createdAt: daysAgoIso(90), updatedAt: daysAgoIso(11) },
  { id: "demo-lead-10", organizationId: ORG_ID, title: "Water sanitation -- riverine islands", organizationName: "Oxfam India", contactName: "Neha Kapoor", stage: "lost", estimatedValue: 1750000, currency: "INR", priority: "low", status: "lost", source: "conference", createdAt: daysAgoIso(75), updatedAt: daysAgoIso(30) },
];

export const demoSocialSignals: SocialDashboardSignals = {
  criticalAlertCount: 2,
  queryRan: true,
  xConfigured: true,
  facebookConfigured: true,
};

export const demoCalendarSignals: CalendarDashboardSignals = {
  todayCount: 3,
  upcomingCount: 11,
  hasMeetingWithinHour: true,
};

export const demoExternalMeetingsSignals: ExternalMeetingsDashboardSignals = {
  zoomOAuthConnected: true,
  googleCalendarOAuthConnected: true,
};

export const demoFinancialWatchItems: FinancialWatchItem[] = [
  { id: "demo-fw-1", organizationId: ORG_ID, title: "Field operations budget -- Q3", category: "budget", thresholdType: "below", thresholdAmount: 500000, currentAmount: 612000, currency: "INR", status: "open", createdAt: daysAgoIso(40), updatedAt: daysAgoIso(2) },
  { id: "demo-fw-2", organizationId: ORG_ID, title: "Cold-chain logistics budget", category: "budget", thresholdType: "below", thresholdAmount: 300000, currentAmount: 184000, currency: "INR", status: "open", createdAt: daysAgoIso(35), updatedAt: daysAgoIso(1) },
  { id: "demo-fw-3", organizationId: ORG_ID, title: "Community outreach budget", category: "budget", thresholdType: "below", thresholdAmount: 200000, currentAmount: 245000, currency: "INR", status: "open", createdAt: daysAgoIso(20), updatedAt: daysAgoIso(5) },
  { id: "demo-fw-4", organizationId: ORG_ID, title: "Primary operating account", category: "bank_balance", thresholdType: "below", thresholdAmount: 1000000, currentAmount: 742000, currency: "INR", status: "open", createdAt: daysAgoIso(60), updatedAt: daysAgoIso(1) },
  { id: "demo-fw-5", organizationId: ORG_ID, title: "Restricted grant account -- UNICEF", category: "bank_balance", thresholdType: "below", thresholdAmount: 500000, currentAmount: 1180000, currency: "INR", status: "open", createdAt: daysAgoIso(55), updatedAt: daysAgoIso(3) },
  { id: "demo-fw-6", organizationId: ORG_ID, title: "Vendor payment -- diagnostic equipment", category: "accounts_actionable", thresholdType: "above", thresholdAmount: 0, currentAmount: 340000, currency: "INR", status: "open", dueAt: daysAgoIso(2), createdAt: daysAgoIso(14), updatedAt: daysAgoIso(2) },
  { id: "demo-fw-7", organizationId: ORG_ID, title: "Grant utilization report -- Gavi Alliance", category: "accounts_actionable", thresholdType: "above", thresholdAmount: 0, currentAmount: 0, currency: "INR", status: "open", dueAt: daysFromNowIso(6), createdAt: daysAgoIso(10), updatedAt: daysAgoIso(1) },
];

export const demoThreadsSignals: ThreadsDashboardSignals = {
  oauthConnected: true,
  recentPostCount: 14,
  openReplyCount: 3,
};

export const demoMetaBusinessSignals: MetaBusinessDashboardSignals = {
  oauthConnected: true,
  recentPostCount: 22,
  activeCampaignCount: 3,
  overBudgetCampaignCount: 1,
};
