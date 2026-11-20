import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Message with agent on the lead panel (customer-fireable stack, PR 5, 2026-11-20).
vi.mock("../../demo/demoMode", () => ({ isDemoModeEnabled: () => false }));
vi.mock("../../auth/AuthProvider", () => ({ useAuth: () => ({ session: { user: { id: "emp", role: "Employee" } } }) }));

import { LeadsSection } from "./LeadsSection";

const leads = [
  { id: "l1", organizationId: "o", title: "Acme - Asha", stage: "new", status: "open", priority: "medium", ownerUserId: "emp", country: "AE", consentBasis: "opt_in", contactPhoneE164: "+971501234567", createdAt: "x", updatedAt: "x" },
];

function stub(post: { status: number; body: unknown }) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.includes("/agent-messages")) {
      if (init?.method === "POST") return { ok: post.status < 400, status: post.status, json: async () => post.body };
      return { ok: true, status: 200, json: async () => ({ job: null }) };
    }
    const body = url.includes("call-queue") ? { callable: [], refused: [] } : url.includes("/history") ? { history: [] }
      : url.includes("/staff") ? { staff: [] } : { leads };
    return { ok: true, status: 200, json: async () => body };
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function openLead() {
  render(<LeadsSection />);
  fireEvent.click(await screen.findByText("Acme - Asha"));
  return screen.findByTestId("agent-message");
}

describe("Message with agent", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("starts a WhatsApp conversation and says so", async () => {
    const fetchMock = stub({ status: 202, body: { jobId: "m1", status: "running" } });
    await openLead();
    fireEvent.click(screen.getByRole("button", { name: "WhatsApp" }));
    expect(await screen.findByText(/The agent has opened the conversation/)).toBeTruthy();
    const post = fetchMock.mock.calls.find(([, i]) => (i as RequestInit | undefined)?.method === "POST") as [string, RequestInit];
    expect(post[0]).toBe("/api/crm/leads/l1/agent-messages");
    expect(JSON.parse(String(post[1].body))).toEqual({ channel: "whatsapp" });
  });

  it("explains what is not set up yet", async () => {
    stub({ status: 409, body: { setup: ["sms_not_linked", "sms_opening_text_missing"] } });
    await openLead();
    fireEvent.click(screen.getByRole("button", { name: "SMS" }));
    expect(await screen.findByText("Not set up: Triaxis has not linked your SMS number yet; your opening SMS is not written yet.")).toBeTruthy();
  });

  it("shows the contactability gate's reasons", async () => {
    stub({ status: 409, body: { reasons: ["tdra_registration_missing"] } });
    await openLead();
    fireEvent.click(screen.getByRole("button", { name: "SMS" }));
    await waitFor(() => expect(screen.getByText(/Refused: Cold calls in the UAE need TDRA registration/)).toBeTruthy());
  });
});
