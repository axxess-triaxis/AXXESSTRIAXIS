// Sprint 1 pilot portfolio (2026-08-15): Mixpanel's existing integration
// (src/services/analytics/MixpanelAnalyticsProvider.ts, NEXT_PUBLIC_MIXPANEL_TOKEN) is
// event-send-only. This is a separate, new, query-capable integration point using Mixpanel's own
// Service Account credentials (distinct from the public project token), following
// sentryProjectHealth.ts's exact not-configured/ok/error shape.

export type MixpanelQueryHealthResult =
  | { status: "not-configured"; provider: "none" }
  | { status: "ok"; provider: "mixpanel"; eventsLast24h: number }
  | { status: "error"; provider: "mixpanel"; error: string };

function getMixpanelQueryConfig() {
  const username = process.env.MIXPANEL_SERVICE_ACCOUNT_USERNAME;
  const secret = process.env.MIXPANEL_SERVICE_ACCOUNT_SECRET;
  const projectId = process.env.MIXPANEL_PROJECT_ID;
  if (!username || !secret || !projectId) return undefined;
  return { username, secret, projectId };
}

export async function fetchMixpanelQueryHealth(): Promise<MixpanelQueryHealthResult> {
  const config = getMixpanelQueryConfig();
  if (!config) {
    return { status: "not-configured", provider: "none" };
  }

  try {
    const today = new Date().toISOString().slice(0, 10);
    const authorization = `Basic ${Buffer.from(`${config.username}:${config.secret}`).toString("base64")}`;
    const response = await fetch(
      `https://mixpanel.com/api/query/events?event=%5B%5D&type=general&unit=day&from_date=${today}&to_date=${today}&project_id=${config.projectId}`,
      { headers: { Authorization: authorization }, cache: "no-store" },
    );

    if (!response.ok) {
      const message = await response.text().catch(() => "");
      console.error("[mixpanelQueryHealth] Mixpanel request failed", { status: response.status, message });
      return { status: "error", provider: "mixpanel", error: `Mixpanel request failed with ${response.status}` };
    }

    const payload = await response.json() as { data?: { values?: Record<string, Record<string, number>> } };
    const totals = Object.values(payload.data?.values ?? {});
    const eventsLast24h = totals.reduce((sum, dayCounts) => sum + Object.values(dayCounts).reduce((s, v) => s + v, 0), 0);
    return { status: "ok", provider: "mixpanel", eventsLast24h };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[mixpanelQueryHealth] Mixpanel request threw", { error: message });
    return { status: "error", provider: "mixpanel", error: message };
  }
}
