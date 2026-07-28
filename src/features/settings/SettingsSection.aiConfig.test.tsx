import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsSection } from "./SettingsSection";

// SA-2 (2026-07-28) / A-31: the AI Configuration tab used to show 5 active-looking toggle
// switches with no onClick handler (a dead-toggle defect, same class as SA-1's Security tab fix),
// plus hardcoded usage numbers identical for every tenant. These tests lock in that every toggle
// is now genuinely disabled with an honest reason, and that AI Usage Statistics prefers real
// per-tenant data from GET /api/ai/model-policy, falling back to the pre-existing honestly-labeled
// illustrative numbers only when that fetch fails.
vi.mock("../../auth/AuthProvider", () => ({
  useAuth: () => ({ session: { user: { id: "user-1", organizationId: "org-1", role: "Organization Admin" }, status: "authenticated" } }),
}));

function setAiConfigTab() {
  window.history.pushState({}, "", "/settings?tab=ai%20configuration");
}

describe("Settings AI Configuration tab (SA-2 fix)", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.pushState({}, "", "/settings");
  });

  it("renders all 5 AI Engine Configuration switches as disabled with an honest reason", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("no fetch in this test"));
    setAiConfigTab();
    render(<SettingsSection />);

    const switches = screen.getAllByRole("switch");
    expect(switches).toHaveLength(5);
    for (const control of switches) {
      expect(control).toBeDisabled();
    }
    expect(screen.getAllByText("Enforced platform default -- not tenant-configurable yet")).toHaveLength(4);
    expect(screen.getByText("Requires admin setup")).toBeInTheDocument();
  });

  it("shows real per-tenant usage when GET /api/ai/model-policy returns logged events", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        recentUsage: [
          { provider: "openai", human_review_required: true, estimated_cost_usd: 0.01 },
          { provider: "local", human_review_required: false, estimated_cost_usd: 0 },
        ],
      }),
    });
    setAiConfigTab();
    render(<SettingsSection />);

    await waitFor(() => {
      expect(screen.getByText("Live tenant data (most recent 20 events)")).toBeInTheDocument();
    });
    expect(screen.getByText("Events Logged").previousElementSibling).toHaveTextContent("2");
    expect(screen.getByText("Required Human Review").previousElementSibling).toHaveTextContent("1");
    expect(screen.queryByText("Illustrative, not yet tenant-tracked")).not.toBeInTheDocument();
  });

  it("shows an honest empty state when the tenant has no logged AI usage yet", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, json: async () => ({ recentUsage: [] }) });
    setAiConfigTab();
    render(<SettingsSection />);

    await waitFor(() => {
      expect(screen.getByText("No AI usage logged yet for this organization.")).toBeInTheDocument();
    });
  });

  it("falls back to the existing illustrative label if the usage fetch itself fails", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("network error"));
    setAiConfigTab();
    render(<SettingsSection />);

    await waitFor(() => {
      expect(screen.getByText("Illustrative, not yet tenant-tracked")).toBeInTheDocument();
    });
  });
});
