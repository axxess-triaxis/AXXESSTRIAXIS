import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = { demoMode: false, role: "Manager" };

vi.mock("../../demo/demoMode", () => ({ isDemoModeEnabled: () => state.demoMode }));
vi.mock("../../auth/AuthProvider", () => ({ useAuth: () => ({ session: { user: { id: "mgr", role: state.role } } }) }));

import { LeadSourcingSection, cadenceText } from "./LeadSourcingSection";

const schedule = {
  id: "s1", name: "Dubai brokers", segment: "brokerage", countries: ["AE"], cities: ["Dubai"], perRun: 10, cadence: "weekly", dayOfWeek: 1,
  dayOfMonth: null, hourLocal: 9, timezone: "Asia/Dubai", enabled: true, nextRunAt: "2026-11-23T05:00:00Z", lastRunAt: null, lastSkipReason: null,
};
const run = {
  id: "r1", status: "done", seedSource: "discovery", scheduleId: "s1", segment: "brokerage", seedCount: 8, searchCount: 12,
  stats: { "Leads imported automatically": 5 }, error: null, createdAt: "2026-11-18T05:00:00Z", finishedAt: "2026-11-18T05:20:00Z",
};
const candidate = {
  id: "c1", company: "Example Realty", domain: "examplerealty.ae", country: "AE", contactName: "A. Person", role: "Director", email: "info@examplerealty.ae",
  emailKind: "published-role", status: "imported", leadId: "l1", importedAutomatically: true, removedAt: null, evidence: ["https://examplerealty.ae/contact"],
};

function stubApi() {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    let body: unknown = {};
    if (url.endsWith("/remove")) body = { removed: true, excluded: 1 };
    else if (url.includes("/runs/r1")) body = { run, candidates: [candidate] };
    else if (url.endsWith("/runs")) body = { runs: [run], usage: { searches: 12, searchLimit: 300, companies: 8, companyLimit: 200 } };
    else if (url.endsWith("/schedules") && method === "GET") body = { schedules: [schedule] };
    else if (url.includes("/exclusions") && method === "GET") body = { exclusions: [] };
    else if (url.endsWith("/run")) body = { started: true, target: 10 };
    return { ok: true, status: 200, json: async () => body };
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("LeadSourcingSection", () => {
  afterEach(() => {
    state.demoMode = false;
    state.role = "Manager";
    vi.unstubAllGlobals();
  });

  it("makes no API calls in demo mode", () => {
    state.demoMode = true;
    const fetchMock = stubApi();
    render(<LeadSourcingSection />);
    expect(screen.getByText(/not part of the demo workspace/)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows nothing and calls nothing for a role without senior lead access", () => {
    state.role = "Employee";
    const fetchMock = stubApi();
    render(<LeadSourcingSection />);
    expect(screen.getByText(/available to admins, executives and managers/)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows usage, schedules and runs, and starts a run on Run now", async () => {
    const fetchMock = stubApi();
    render(<LeadSourcingSection />);
    await waitFor(() => expect(screen.getByTestId("usage-searches").textContent).toBe("12 of 300"));
    expect(screen.getAllByText("Dubai brokers").length).toBeGreaterThan(0);
    expect(screen.getByText(/5 leads imported/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Run now/ }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toMatch(/up to 10 companies/));
    expect(fetchMock.mock.calls.some(([u, i]) => String(u).endsWith("/schedules/s1/run") && (i as RequestInit).method === "POST")).toBe(true);
  });

  it("opens a run and removes a lead with the exclude flag set by default", async () => {
    const fetchMock = stubApi();
    render(<LeadSourcingSection />);
    await waitFor(() => expect(screen.getAllByTestId("run-row")).toHaveLength(1));
    fireEvent.click(screen.getAllByTestId("run-row")[0].querySelector("button") as HTMLButtonElement);
    await waitFor(() => expect(screen.getByText("Imported automatically")).toBeTruthy());
    expect(screen.getByText("Role inbox (info@, sales@)")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Remove Example Realty" }));
    await waitFor(() => expect(screen.getByText(/added it to the exclusion list/)).toBeTruthy());
    const call = fetchMock.mock.calls.find(([u]) => String(u).endsWith("/remove"));
    expect(JSON.parse(String((call?.[1] as RequestInit).body))).toEqual({ exclude: true });
  });

  it("describes cadences in words", () => {
    expect(cadenceText({ cadence: "daily", dayOfWeek: null, dayOfMonth: null, hourLocal: 7, timezone: "Asia/Kolkata" })).toBe("Every day at 07:00 India (IST)");
    expect(cadenceText({ cadence: "weekly", dayOfWeek: 1, dayOfMonth: null, hourLocal: 9, timezone: "Asia/Dubai" })).toBe("Every Monday at 09:00 UAE (GST)");
    expect(cadenceText({ cadence: "monthly", dayOfWeek: null, dayOfMonth: 15, hourLocal: 18, timezone: "Asia/Dubai" })).toBe("Monthly on day 15 at 18:00 UAE (GST)");
  });
});
