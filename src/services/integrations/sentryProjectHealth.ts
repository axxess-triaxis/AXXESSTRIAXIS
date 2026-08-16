// Sprint 1 pilot portfolio (2026-08-15): Sentry has zero prior integration anywhere in this
// codebase (no dependency, no code) -- this is the full template for the honest
// not-configured/ok/error pattern the other 3 new integration-health modules
// (postHogQueryHealth/mixpanelQueryHealth/asanaPortfolioHealth) copy, mirroring
// src/services/email/feedbackEmail.ts's established `not-configured|sent|failed` shape: check the
// key first and return before any network call, never fabricate a number on failure.

export type SentryProjectHealthResult =
  | { status: "not-configured"; provider: "none" }
  | { status: "ok"; provider: "sentry"; issuesLast24h: number; unresolvedIssues: number }
  | { status: "error"; provider: "sentry"; error: string };

function getSentryConfig() {
  const authToken = process.env.SENTRY_AUTH_TOKEN;
  const orgSlug = process.env.SENTRY_ORG_SLUG;
  const projectSlug = process.env.SENTRY_PROJECT_SLUG;
  if (!authToken || !orgSlug || !projectSlug) return undefined;
  return { authToken, orgSlug, projectSlug };
}

export async function fetchSentryProjectHealth(): Promise<SentryProjectHealthResult> {
  const config = getSentryConfig();
  if (!config) {
    return { status: "not-configured", provider: "none" };
  }

  try {
    const response = await fetch(
      `https://sentry.io/api/0/projects/${config.orgSlug}/${config.projectSlug}/issues/?statsPeriod=24h`,
      { headers: { Authorization: `Bearer ${config.authToken}` }, cache: "no-store" },
    );

    if (!response.ok) {
      const message = await response.text().catch(() => "");
      console.error("[sentryProjectHealth] Sentry request failed", { status: response.status, message });
      return { status: "error", provider: "sentry", error: `Sentry request failed with ${response.status}` };
    }

    const issues = await response.json() as Array<{ status?: string }>;
    return {
      status: "ok",
      provider: "sentry",
      issuesLast24h: issues.length,
      unresolvedIssues: issues.filter((issue) => !issue.status || issue.status === "unresolved").length,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[sentryProjectHealth] Sentry request threw", { error: message });
    return { status: "error", provider: "sentry", error: message };
  }
}
