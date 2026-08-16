// Sprint 1 pilot portfolio (2026-08-15): PostHog's existing integration in this codebase
// (src/services/analytics/PostHogAnalyticsProvider.ts, NEXT_PUBLIC_POSTHOG_KEY) is event-send-only
// -- it never reads data back. This is a separate, new, query-capable integration point using
// PostHog's own read-side credentials (a personal API key + project id, distinct from the public
// capture key), following sentryProjectHealth.ts's exact not-configured/ok/error shape.

export type PostHogQueryHealthResult =
  | { status: "not-configured"; provider: "none" }
  | { status: "ok"; provider: "posthog"; eventsLast24h: number }
  | { status: "error"; provider: "posthog"; error: string };

function getPostHogQueryConfig() {
  const personalApiKey = process.env.POSTHOG_PERSONAL_API_KEY;
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";
  if (!personalApiKey || !projectId) return undefined;
  return { personalApiKey, projectId, host };
}

export async function fetchPostHogQueryHealth(): Promise<PostHogQueryHealthResult> {
  const config = getPostHogQueryConfig();
  if (!config) {
    return { status: "not-configured", provider: "none" };
  }

  try {
    const response = await fetch(
      `${config.host}/api/projects/${config.projectId}/events/?limit=1`,
      { headers: { Authorization: `Bearer ${config.personalApiKey}` }, cache: "no-store" },
    );

    if (!response.ok) {
      const message = await response.text().catch(() => "");
      console.error("[postHogQueryHealth] PostHog request failed", { status: response.status, message });
      return { status: "error", provider: "posthog", error: `PostHog request failed with ${response.status}` };
    }

    const payload = await response.json() as { count?: number };
    return { status: "ok", provider: "posthog", eventsLast24h: payload.count ?? 0 };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[postHogQueryHealth] PostHog request threw", { error: message });
    return { status: "error", provider: "posthog", error: message };
  }
}
