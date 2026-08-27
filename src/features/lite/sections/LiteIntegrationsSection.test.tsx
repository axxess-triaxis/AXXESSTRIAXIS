import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Lite Settings real-modules pass (2026-08-27): proves the Lite Integrations tab renders its own
// small hardcoded connector list (not X0's 28-entry catalogue) and reflects live connection status
// from the existing, reused /api/connectors/status endpoint.
const state = {
  connections: [] as { providerId: string }[],
  params: new Map<string, string>(),
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => ({ get: (key: string) => state.params.get(key) ?? null }),
}));

const fetchMock = vi.fn(async () => new Response(JSON.stringify({ connections: state.connections }), { status: 200 }));

import { LiteIntegrationsSection } from "./LiteIntegrationsSection";

describe("LiteIntegrationsSection", () => {
  afterEach(() => {
    state.connections = [];
    state.params = new Map();
    vi.restoreAllMocks();
  });

  it("renders the small Lite connector list, not X0's full catalogue", async () => {
    global.fetch = fetchMock as typeof fetch;
    render(<LiteIntegrationsSection />);

    await waitFor(() => expect(screen.getByText("Gmail")).toBeInTheDocument());
    expect(screen.getByText("Slack")).toBeInTheDocument();
    expect(screen.getByText("HubSpot")).toBeInTheDocument();
    // X0-only / non-pilot connectors must never appear here.
    expect(screen.queryByText("Jira")).not.toBeInTheDocument();
    expect(screen.queryByText("Salesforce")).not.toBeInTheDocument();
  });

  it("shows a Connected badge for a provider the status endpoint reports as connected", async () => {
    state.connections = [{ providerId: "gmail" }];
    global.fetch = fetchMock as typeof fetch;
    render(<LiteIntegrationsSection />);

    await waitFor(() => expect(screen.getAllByText("Connected").length).toBeGreaterThan(0));
  });
});
