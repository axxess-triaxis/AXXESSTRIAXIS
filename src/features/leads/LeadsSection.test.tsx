import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = { demoMode: false, role: "Employee" };

vi.mock("../../demo/demoMode", () => ({ isDemoModeEnabled: () => state.demoMode }));
vi.mock("../../auth/AuthProvider", () => ({ useAuth: () => ({ session: { user: { id: "emp", role: state.role } } }) }));

import { LeadsSection } from "./LeadsSection";

const leads = [
  { id: "l1", organizationId: "o", title: "Acme - Asha", stage: "new", status: "open", priority: "medium", ownerUserId: "emp", country: "IN", consentBasis: "opt_in", contactPhoneE164: "+919876543210", createdAt: "x", updatedAt: "x" },
];
const queue = {
  callable: [{ id: "l1", title: "Acme - Asha", phoneE164: "+919876543210", stage: "new", consentBasis: "opt_in", registryStatus: "unchecked", registryCheckedAt: null, lastContactAt: null }],
  refused: [{ lead: { id: "l2", title: "Beta - Omar", phoneE164: "+971500000000", stage: "new" }, reasons: ["tdra_registration_missing", "counsel_sign_off_missing"] }],
};

const funnel = {
  window: { days: 30 },
  activity: { leadsAdded: 4, emailsSent: 80, delivered: 78, bounced: 2, complained: 0, replies: 3, repliesByCategory: { interested: 1, other: 2 } },
  pipelineNow: { open: 4, byStage: { new: 3, qualifying: 1 }, won: 0, lost: 0 },
  notTracked: ["meetings", "trials", "paid"],
  ramp: { budget: 0, reason: "paused_bounce_rate", sendingEnabled: true, sent7d: 80, bounceRate7d: 0.025, complaintRate7d: 0 },
};

function stubApi() {
  const fetchMock = vi.fn(async (url: string) => {
    const body = url.includes("/funnel") ? funnel : url.includes("call-queue") ? queue : url.includes("/history") ? { history: [] } : url.includes("/staff") ? { staff: [{ id: "emp", displayName: "Emp" }] } : { leads };
    return { ok: true, status: 200, json: async () => body };
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("LeadsSection", () => {
  afterEach(() => {
    state.demoMode = false;
    state.role = "Employee";
    vi.unstubAllGlobals();
  });

  it("lists leads and opens a lead with history; an Employee gets no owner select", async () => {
    const fetchMock = stubApi();
    render(<LeadsSection />);
    fireEvent.click(await screen.findByText("Acme - Asha"));
    await screen.findByText("No contact or changes yet.");
    expect(screen.getByLabelText("Stage")).toBeTruthy();
    expect(screen.queryByLabelText("Owner")).toBeNull();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/api/crm/staff"))).toBe(false);
  });

  it("shows a sorted reply in the lead's history", async () => {
    const fetchMock = stubApi();
    fetchMock.mockImplementation(async (url: string) => {
      const body = url.includes("/history")
        ? { history: [{ kind: "reply", at: "2026-11-13T10:00:00Z", category: "interested", subject: "Re: Quick question", fromEmail: "asha@acme.in" }] }
        : url.includes("call-queue") ? queue : { leads };
      return { ok: true, status: 200, json: async () => body };
    });
    render(<LeadsSection />);
    fireEvent.click(await screen.findByText("Acme - Asha"));
    expect(await screen.findByText(/Reply: Interested - Re: Quick question/)).toBeTruthy();
  });

  it("a Manager can see the owner select", async () => {
    state.role = "Manager";
    stubApi();
    render(<LeadsSection />);
    fireEvent.click(await screen.findByText("Acme - Asha"));
    await waitFor(() => expect(screen.getByLabelText("Owner")).toBeTruthy());
  });

  it("the call queue links only callable leads to the dialler, and explains refusals", async () => {
    stubApi();
    render(<LeadsSection />);
    fireEvent.click(await screen.findByRole("tab", { name: /Call queue/ }));
    const callable = await screen.findByTestId("callable-lead");
    expect(callable.querySelector("a[href='tel:+919876543210']")).toBeTruthy();
    const refused = screen.getByTestId("refused-lead");
    expect(refused.querySelector("a[href^='tel:']")).toBeNull();
    expect(refused.textContent).toContain("Cold calls in the UAE need TDRA registration");
  });

  it("shows a Manager the funnel from real counts, the paused ramp, and what is not tracked", async () => {
    state.role = "Manager";
    stubApi();
    render(<LeadsSection />);
    fireEvent.click(await screen.findByRole("tab", { name: /Funnel/ }));
    expect((await screen.findByTestId("ramp-status")).textContent).toContain("Paused: the bounce rate reached 2%");
    expect(screen.getByTestId("funnel-activity").textContent).toContain("Delivered78 (97.5%)");
    expect(screen.getByTestId("funnel-pipeline").textContent).toContain("MeetingsNot tracked yet");
  });

  it("gives an Employee no Funnel tab and never calls the funnel API", async () => {
    const fetchMock = stubApi();
    render(<LeadsSection />);
    await screen.findByText("Acme - Asha");
    expect(screen.queryByRole("tab", { name: /Funnel/ })).toBeNull();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/api/crm/funnel"))).toBe(false);
  });

  it("makes no API calls in the demo workspace", () => {
    state.demoMode = true;
    const fetchMock = stubApi();
    render(<LeadsSection />);
    expect(screen.getByText("Leads and calls are not part of the demo workspace.")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
