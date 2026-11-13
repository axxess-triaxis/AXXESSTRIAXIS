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
  callable: [{ id: "l1", title: "Acme - Asha", phoneE164: "+919876543210", stage: "new", consentBasis: "opt_in", registryStatus: "unchecked", registryCheckedAt: null, lastContactAt: null,
    agentCall: { allowed: false, reasons: ["dlt_registration_missing", "counsel_sign_off_missing"] }, agentJob: null }],
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
    window.sessionStorage.clear();
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

  it("after Call, asks how the call went on return and logs the outcome with one tap", async () => {
    const fetchMock = stubApi();
    render(<LeadsSection />);
    fireEvent.click(await screen.findByRole("tab", { name: /Call queue/ }));
    fireEvent.click(await screen.findByRole("link", { name: /Call \+919876543210/ }));
    fetchMock.mockImplementationOnce(async () => ({ ok: true, status: 201, json: async () => ({ logged: true }) }) as never);
    fireEvent(document, new Event("visibilitychange"));

    const banner = await screen.findByTestId("pending-call");
    expect(banner.textContent).toContain("How did the call with Acme - Asha go?");
    fireEvent.click(screen.getByRole("button", { name: "No answer" }));

    await waitFor(() => expect(screen.queryByTestId("pending-call")).toBeNull());
    const post = fetchMock.mock.calls.find(([url, init]) => String(url) === "/api/crm/leads/l1/calls" && (init as RequestInit | undefined)?.method === "POST");
    expect(JSON.parse(String((post?.[1] as RequestInit).body))).toEqual({ outcome: "no_answer" });
    expect(window.sessionStorage.getItem("axxess.pendingCall")).toBeNull();
  });

  it("logs nothing when the caller says they didn't call", async () => {
    const fetchMock = stubApi();
    render(<LeadsSection />);
    fireEvent.click(await screen.findByRole("tab", { name: /Call queue/ }));
    fireEvent.click(await screen.findByRole("link", { name: /Call \+919876543210/ }));
    fireEvent(window, new Event("focus"));
    fireEvent.click(await screen.findByRole("button", { name: "Didn't call" }));
    expect(screen.queryByTestId("pending-call")).toBeNull();
    expect(fetchMock.mock.calls.some(([, init]) => (init as RequestInit | undefined)?.method === "POST")).toBe(false);
  });

  it("shows the gate's reasons when the one-tap log is refused", async () => {
    const fetchMock = stubApi();
    render(<LeadsSection />);
    fireEvent.click(await screen.findByRole("tab", { name: /Call queue/ }));
    fireEvent.click(await screen.findByRole("link", { name: /Call \+919876543210/ }));
    fetchMock.mockImplementationOnce(async () => ({ ok: false, status: 409, json: async () => ({ reasons: ["tdra_registration_missing"] }) }) as never);
    fireEvent(document, new Event("visibilitychange"));
    fireEvent.click(await screen.findByRole("button", { name: "Connected" }));
    expect((await screen.findByTestId("pending-call")).textContent).toContain("Refused: Cold calls in the UAE need TDRA registration");
  });

  it("keeps the full form under Log manually", async () => {
    stubApi();
    render(<LeadsSection />);
    fireEvent.click(await screen.findByRole("tab", { name: /Call queue/ }));
    expect(await screen.findByText("Log manually")).toBeTruthy();
    expect(screen.getByLabelText("Call outcome")).toBeTruthy();
  });

  it("keeps Call with agent disabled and says why while the gate refuses agent calls", async () => {
    stubApi();
    render(<LeadsSection />);
    fireEvent.click(await screen.findByRole("tab", { name: /Call queue/ }));
    const button = await screen.findByRole("button", { name: "Call with agent" });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId("agent-call").textContent).toContain("Agent calls are off: India DLT registration not recorded; counsel sign-off not recorded");
  });

  it("starts an agent call with one click when the gate allows it, and shows the last result", async () => {
    const fetchMock = stubApi();
    const allowedQueue = { ...queue, callable: [{ ...queue.callable[0], agentCall: { allowed: true, reasons: [] }, agentJob: { id: "j1", status: "completed", outcome: "interested", summary: "Wants a demo", failureReason: null } }] };
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.includes("/agent-calls") && init?.method === "POST") return { ok: true, status: 202, json: async () => ({ jobId: "j2", status: "calling" }) };
      const body = url.includes("call-queue") ? allowedQueue : url.includes("/history") ? { history: [] } : { leads };
      return { ok: true, status: 200, json: async () => body };
    });
    render(<LeadsSection />);
    fireEvent.click(await screen.findByRole("tab", { name: /Call queue/ }));
    expect((await screen.findByTestId("agent-call")).textContent).toContain("Agent call: Interested - Wants a demo");
    fireEvent.click(screen.getByRole("button", { name: "Call with agent" }));
    expect(await screen.findByText("The agent is calling. The result will appear here.")).toBeTruthy();
    expect(fetchMock.mock.calls.some(([url, init]) => String(url) === "/api/crm/leads/l1/agent-calls" && (init as RequestInit | undefined)?.method === "POST")).toBe(true);
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
