import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SocialAlertRulesPanel } from "./SocialAlertRulesPanel";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("SocialAlertRulesPanel", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows an honest empty state for a tenant with no rules yet, not fabricated rules", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ rules: [] })));
    render(<SocialAlertRulesPanel />);

    expect(await screen.findByText(/No alert rules configured yet/i)).toBeInTheDocument();
  });

  it("lists real rules returned from the API", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({
      rules: [{ id: "rule-1", organizationId: "org-1", provider: "facebook", keyword: "oxygen resilience", topic: "healthcare funding", urgency: "high", createdAt: "2026-08-04T00:00:00.000Z" }],
    })));
    render(<SocialAlertRulesPanel />);

    expect(await screen.findByText(/oxygen resilience/i)).toBeInTheDocument();
    expect(screen.getByText(/healthcare funding/i)).toBeInTheDocument();
  });

  it("adding a rule calls the real create endpoint and shows it in the list", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === "POST") {
        return jsonResponse({ rule: { id: "rule-new", organizationId: "org-1", provider: "facebook", keyword: "flood advisory", topic: "field operations", urgency: "medium", createdAt: "2026-08-04T00:00:00.000Z" } }, 201);
      }
      if (url.endsWith("/api/social-alert-rules")) return jsonResponse({ rules: [] });
      return jsonResponse({}, 404);
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<SocialAlertRulesPanel />);

    await waitFor(() => expect(screen.getByText(/No alert rules configured yet/i)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("Keyword"), { target: { value: "flood advisory" } });
    fireEvent.change(screen.getByLabelText("Topic"), { target: { value: "field operations" } });
    fireEvent.click(screen.getByText("Add rule"));

    expect(await screen.findByText(/flood advisory/i)).toBeInTheDocument();
    const postCall = fetchMock.mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === "POST");
    expect(postCall).toBeDefined();
    const body = JSON.parse((postCall?.[1] as RequestInit).body as string) as Record<string, unknown>;
    expect(body).toMatchObject({ provider: "facebook", keyword: "flood advisory", topic: "field operations", urgency: "medium" });
  });

  it("shows a validation error instead of calling the API when keyword or topic is blank", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ rules: [] })));
    render(<SocialAlertRulesPanel />);

    await waitFor(() => expect(screen.getByText(/No alert rules configured yet/i)).toBeInTheDocument());
    fireEvent.click(screen.getByText("Add rule"));

    expect(await screen.findByText(/Keyword and topic are both required/i)).toBeInTheDocument();
  });

  it("removing a rule calls the real delete endpoint and removes it from the list", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === "DELETE") return jsonResponse({ ok: true });
      if (url.endsWith("/api/social-alert-rules")) {
        return jsonResponse({ rules: [{ id: "rule-1", organizationId: "org-1", provider: "facebook", keyword: "oxygen resilience", topic: "healthcare funding", urgency: "high", createdAt: "2026-08-04T00:00:00.000Z" }] });
      }
      return jsonResponse({}, 404);
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<SocialAlertRulesPanel />);

    await screen.findByText(/oxygen resilience/i);
    fireEvent.click(screen.getByLabelText(/Remove rule for oxygen resilience/i));

    await waitFor(() => expect(screen.queryByText(/oxygen resilience/i)).not.toBeInTheDocument());
    const deleteCall = fetchMock.mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === "DELETE");
    expect(deleteCall?.[0]).toBe("/api/social-alert-rules/rule-1");
  });

  it("offers Brand24 as a selectable provider (Sprint 1 real Social Alerts, 2026-08-17)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ rules: [] })));
    render(<SocialAlertRulesPanel />);

    await waitFor(() => expect(screen.getByText(/No alert rules configured yet/i)).toBeInTheDocument());
    expect(screen.getByRole("option", { name: "Brand24" })).toBeInTheDocument();
  });
});
