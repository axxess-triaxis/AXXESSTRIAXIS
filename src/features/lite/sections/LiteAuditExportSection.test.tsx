import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Lite Settings real-modules pass (2026-08-27): proves the on-page preview and the download action
// apply the SAME hybrid RBAC the export route itself enforces -- a non-admin never sees another
// actor's row on screen, matching what they can actually export.
const state = {
  user: { id: "employee-1", organizationId: "org-1", role: "Employee" as string, displayName: "Asha Verma" },
  logs: [
    { id: "log-1", actorUserId: "admin-1", action: "auth.login", resourceType: "user", createdAt: "2026-08-27T00:00:00Z" },
    { id: "log-2", actorUserId: "employee-1", action: "task.created", resourceType: "task", createdAt: "2026-08-27T01:00:00Z" },
  ],
};

vi.mock("../../../auth/AuthProvider", () => ({
  useAuth: () => ({ session: { user: state.user, status: "authenticated" } }),
}));

vi.mock("../../../repositories/supabaseEnterpriseRepositories", () => ({
  tenantScopeFromUser: (user: { id: string; organizationId: string; role: string }) => ({ userId: user.id, organizationId: user.organizationId, role: user.role }),
}));

vi.mock("../../../providers/serviceProvider", () => ({
  applicationServices: {
    auditLogsRepository: { list: async () => state.logs },
  },
}));

import { LiteAuditExportSection } from "./LiteAuditExportSection";

describe("LiteAuditExportSection", () => {
  afterEach(() => {
    state.user = { id: "employee-1", organizationId: "org-1", role: "Employee", displayName: "Asha Verma" };
    vi.restoreAllMocks();
  });

  it("a non-admin's preview shows only their own actions, not another actor's", async () => {
    render(<LiteAuditExportSection />);
    await waitFor(() => expect(screen.getByText("task.created")).toBeInTheDocument());
    expect(screen.queryByText("auth.login")).not.toBeInTheDocument();
    expect(screen.getByText(/your own actions/i)).toBeInTheDocument();
  });

  it("Super Admin/Organization Admin see the whole organization's activity", async () => {
    state.user.role = "Organization Admin";
    render(<LiteAuditExportSection />);
    await waitFor(() => expect(screen.getByText("task.created")).toBeInTheDocument());
    expect(screen.getByText("auth.login")).toBeInTheDocument();
    expect(screen.getByText(/organization's activity/i)).toBeInTheDocument();
  });

  it("downloading a PDF posts format: pdf and triggers a blob download", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ fileName: "log.pdf", contentBase64: btoa("%PDF-fake") }), { status: 201 }));
    global.fetch = fetchMock as typeof fetch;
    const createObjectURL = vi.fn(() => "blob:fake-url");
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = vi.fn();

    render(<LiteAuditExportSection />);
    await waitFor(() => expect(screen.getByText("task.created")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /download pdf/i }));

    await waitFor(() => expect(createObjectURL).toHaveBeenCalled());
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toMatchObject({ format: "pdf" });
  });
});
