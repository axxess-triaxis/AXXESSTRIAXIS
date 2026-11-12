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

function stubApi() {
  const fetchMock = vi.fn(async (url: string) => {
    const body = url.includes("call-queue") ? queue : url.includes("/history") ? { history: [] } : url.includes("/staff") ? { staff: [{ id: "emp", displayName: "Emp" }] } : { leads };
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

  it("makes no API calls in the demo workspace", () => {
    state.demoMode = true;
    const fetchMock = stubApi();
    render(<LeadsSection />);
    expect(screen.getByText("Leads and calls are not part of the demo workspace.")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
