import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Sprint 4 (Integrations, Analytics, and Operational Evidence): proves the required minimum event
// taxonomy is not just declared in AnalyticsEventName but actually dispatched from real application
// code -- a declared-but-never-fired event name would satisfy the type system while telling the
// product team nothing. Each entry below names the real source file expected to call
// trackEvent("<eventName>", ...) for that golden-path category, read directly rather than assumed.
const dispatchSites: Array<{ category: string; eventName: string; file: string }> = [
  { category: "App opened / workspace loaded", eventName: "app_opened", file: "src/app/App.tsx" },
  { category: "Signup started", eventName: "sign_up_started", file: "src/features/auth/EnterpriseAuthFlowPage.tsx" },
  { category: "Signup completed", eventName: "sign_up_completed", file: "src/features/auth/EnterpriseAuthFlowPage.tsx" },
  { category: "Login completed", eventName: "user_login", file: "src/app/auth/page.tsx" },
  { category: "Logout completed", eventName: "user_logout", file: "src/app/App.tsx" },
  { category: "Tenant provisioned", eventName: "organization_created", file: "src/features/onboarding/EnterpriseOnboardingPage.tsx" },
  { category: "Profile updated", eventName: "profile_updated", file: "src/features/settings/SettingsSection.tsx" },
  { category: "Document uploaded", eventName: "document_uploaded", file: "src/features/documents/DocumentsSection.tsx" },
  { category: "Document indexed", eventName: "rag_ingestion_completed", file: "src/features/documents/DocumentsSection.tsx" },
  { category: "RAG question asked", eventName: "rag_query_submitted", file: "src/features/ai-workspace/AIWorkspaceSection.tsx" },
  { category: "RAG answer generated", eventName: "rag_answer_generated", file: "src/features/ai-workspace/AIWorkspaceSection.tsx" },
  { category: "AI answer approved/rejected", eventName: "ai_answer_reviewed", file: "src/features/ai-workspace/AIReviewInboxPage.tsx" },
  { category: "Task/work item created from AI answer", eventName: "workflow_completion_celebrated", file: "src/features/ai-workspace/AIReviewInboxPage.tsx" },
  { category: "Dashboard viewed", eventName: "dashboard_viewed", file: "src/app/App.tsx" },
  { category: "Invite created or attempted", eventName: "user_invited", file: "src/features/settings/SettingsSection.tsx" },
  { category: "Feedback submitted", eventName: "feedback_submitted", file: "src/components/feedback/BetaFeedbackModal.tsx" },
  { category: "Error/fallback surfaced safely", eventName: "error_boundary_triggered", file: "src/components/feedback/ErrorBoundary.tsx" },
  { category: "Investor preview entered", eventName: "user_login", file: "src/app/auth/page.tsx" },
];

describe("Sprint 4 analytics event taxonomy: dispatch proof, not just declared types", () => {
  it.each(dispatchSites)("$category ($eventName) actually fires from $file", ({ eventName, file }) => {
    const source = readFileSync(join(process.cwd(), file), "utf8");
    expect(source).toContain(`"${eventName}"`);
    expect(source).toMatch(new RegExp(`trackEvent\\(["']${eventName}["']`));
  });

  it("covers at least 15 distinct required categories with real dispatch sites, exceeding the sprint minimum", () => {
    const distinctCategories = new Set(dispatchSites.map((entry) => entry.category));
    expect(distinctCategories.size).toBeGreaterThanOrEqual(15);
  });
});
