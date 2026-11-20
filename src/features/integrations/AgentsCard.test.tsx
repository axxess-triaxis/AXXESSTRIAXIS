import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentsCard } from "./AgentsCard";

// Agents card (customer-fireable stack, PR 5, 2026-11-20).
const SETTINGS = {
  callismaticEnabled: false, omnidamusEnabled: false, callPurpose: null, smsOpeningText: null, callerIdE164: null,
  whatsappPhoneNumberId: null, whatsappNumberE164: null, whatsappTemplate: null, smsOriginationIdentity: null, smsNumberE164: null,
  dltIndiaRegistered: false, tdraUaeRegistered: false, counselSignedOff: false, updatedAt: null,
};
const response = (operator: boolean, settings = SETTINGS) => ({
  organizationId: "org-1", operator, settings,
  readiness: { call: ["callismatic_off", "caller_id_missing"], whatsapp: ["omnidamus_off"], sms: ["omnidamus_off"] },
});

function stub(handler: (url: string, init?: RequestInit) => { status: number; body: unknown }) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const { status, body } = handler(url, init);
    return { ok: status < 400, status, json: async () => body };
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("AgentsCard", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("shows an admin what each agent still needs, without the operator panel", async () => {
    stub(() => ({ status: 200, body: response(false) }));
    render(<AgentsCard />);
    expect(await screen.findByText(/the voice agent is turned off for your organization; Triaxis has not linked your caller ID yet/)).toBeTruthy();
    expect(screen.getByText(/India DLT no/)).toBeTruthy();
    expect(screen.queryByTestId("agents-operator-panel")).toBeNull();
  });

  it("turns the voice agent on and saves the wording through the organization route", async () => {
    const fetchMock = stub((url, init) => ({ status: 200, body: init?.method === "PATCH" ? response(false, { ...SETTINGS, callismaticEnabled: true }) : response(false) }));
    render(<AgentsCard />);
    fireEvent.click(await screen.findByLabelText("Voice agent (Call with agent)"));
    await waitFor(() => expect(fetchMock.mock.calls.some(([, i]) => (i as RequestInit | undefined)?.method === "PATCH")).toBe(true));
    const [url, init] = fetchMock.mock.calls.find(([, i]) => (i as RequestInit | undefined)?.method === "PATCH") as [string, RequestInit];
    expect(url).toBe("/api/stack/agent-settings");
    expect(JSON.parse(String(init.body))).toEqual({ callismaticEnabled: true });

    fireEvent.change(screen.getByLabelText("Call purpose"), { target: { value: "Ask about the viewing." } });
    fireEvent.click(screen.getByRole("button", { name: "Save wording" }));
    await waitFor(() => expect(fetchMock.mock.calls.filter(([, i]) => (i as RequestInit | undefined)?.method === "PATCH")).toHaveLength(2));
  });

  it("shows a refusal from the server in plain words", async () => {
    stub((_url, init) => (init?.method === "PATCH" ? { status: 409, body: { error: "number_claimed", field: "callerIdE164" } } : { status: 200, body: response(true) }));
    render(<AgentsCard />);
    fireEvent.click(await screen.findByLabelText("Messaging agent (Message with agent)"));
    expect(await screen.findByText("callerIdE164: Another organization already uses this number.")).toBeTruthy();
  });

  it("shows Triaxis's operator panel and loads the chosen organization", async () => {
    const fetchMock = stub((url) => ({
      status: 200,
      body: url === "/api/stack/organizations" ? { organizations: [{ id: "org-2", name: "Sharma Realty" }] } : response(true),
    }));
    render(<AgentsCard />);
    expect(await screen.findByTestId("agents-operator-panel")).toBeTruthy();
    fireEvent.change(await screen.findByLabelText("Organization"), { target: { value: "org-2" } });
    expect(await screen.findByLabelText("Caller ID (E.164)")).toBeTruthy();
    expect(fetchMock.mock.calls.some(([url]) => url === "/api/stack/agent-settings/org-2")).toBe(true);
  });

  it("hides itself for a user the settings route refuses", async () => {
    stub(() => ({ status: 403, body: { error: "Forbidden." } }));
    const { container } = render(<AgentsCard />);
    await waitFor(() => expect(container.querySelector("[data-testid='agents-card']")).toBeNull());
  });
});
