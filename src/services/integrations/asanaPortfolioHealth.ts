// Sprint 1 pilot portfolio (2026-08-15): Asana has no working connector anywhere in this codebase
// today (pluginRegistry.ts catalogues it with pilotEnabled: false; connectorContract.ts has no
// entry for it at all). This is a deliberately separate, admin-owned Personal Access Token read --
// not connectorContract.ts's tenant-facing OAuth2 shape, which is the wrong abstraction for a
// company-wide admin analytics pull -- following sentryProjectHealth.ts's exact
// not-configured/ok/error shape.

export type AsanaPortfolioHealthResult =
  | { status: "not-configured"; provider: "none" }
  | { status: "ok"; provider: "asana"; incompleteTasks: number }
  | { status: "error"; provider: "asana"; error: string };

function getAsanaConfig() {
  const accessToken = process.env.ASANA_ACCESS_TOKEN;
  const workspaceGid = process.env.ASANA_WORKSPACE_GID;
  if (!accessToken || !workspaceGid) return undefined;
  return { accessToken, workspaceGid };
}

export async function fetchAsanaPortfolioHealth(): Promise<AsanaPortfolioHealthResult> {
  const config = getAsanaConfig();
  if (!config) {
    return { status: "not-configured", provider: "none" };
  }

  try {
    const response = await fetch(
      `https://app.asana.com/api/1.0/workspaces/${config.workspaceGid}/tasks/search?completed=false&limit=1`,
      { headers: { Authorization: `Bearer ${config.accessToken}` }, cache: "no-store" },
    );

    if (!response.ok) {
      const message = await response.text().catch(() => "");
      console.error("[asanaPortfolioHealth] Asana request failed", { status: response.status, message });
      return { status: "error", provider: "asana", error: `Asana request failed with ${response.status}` };
    }

    const payload = await response.json() as { data?: unknown[] };
    return { status: "ok", provider: "asana", incompleteTasks: payload.data?.length ?? 0 };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[asanaPortfolioHealth] Asana request threw", { error: message });
    return { status: "error", provider: "asana", error: message };
  }
}
