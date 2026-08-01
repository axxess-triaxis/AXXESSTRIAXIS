import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RoleName } from "../../domain";
import { SettingsSection } from "./SettingsSection";

// SA-2 (2026-07-28) / A-30: the Permissions tab used to render the full 6-role capability schema
// to any viewer regardless of their own role -- founder's own words, "we do not want permission
// schema for other user categories visible to any user." These tests lock in that Super
// Admin/Organization Admin still see the full reference matrix (clearly labeled as such), while
// every other role sees only their own row plus an honest access-denied note.
const state = { role: "Employee" as RoleName };

vi.mock("../../auth/AuthProvider", () => ({
  useAuth: () => ({ session: { user: { id: "user-1", organizationId: "org-1", role: state.role }, status: "authenticated" } }),
}));

function setPermissionsTab() {
  window.history.pushState({}, "", "/settings?tab=permissions");
}

describe("Settings Permissions tab (SA-2 role-aware fix)", () => {
  afterEach(() => {
    window.history.pushState({}, "", "/settings");
    state.role = "Employee";
  });

  it("Organization Admin sees the full reference matrix, clearly labeled as a reference", async () => {
    state.role = "Organization Admin";
    setPermissionsTab();
    render(<SettingsSection />);

    await waitFor(() => {
      expect(screen.getByText("Permission Matrix (Reference)")).toBeInTheDocument();
    });
    expect(screen.getByText("Super Admin")).toBeInTheDocument();
    expect(screen.getByText("Executive")).toBeInTheDocument();
    expect(screen.getByText("Guest")).toBeInTheDocument();
    expect(screen.queryByText(/You do not have permission to manage roles/)).not.toBeInTheDocument();
  });

  it("Employee (non-admin) sees only their own role, not the full schema", async () => {
    state.role = "Employee";
    setPermissionsTab();
    render(<SettingsSection />);

    await waitFor(() => {
      expect(screen.getByText("Your Permissions")).toBeInTheDocument();
    });
    expect(screen.getAllByText("Employee").length).toBeGreaterThan(0);
    expect(screen.queryByText("Super Admin")).not.toBeInTheDocument();
    expect(screen.queryByText("Guest")).not.toBeInTheDocument();
    expect(screen.getByText(/You do not have permission to manage roles/)).toBeInTheDocument();
  });

  it("Guest (non-admin) sees only their own role and the same honest denial note", async () => {
    state.role = "Guest";
    setPermissionsTab();
    render(<SettingsSection />);

    await waitFor(() => {
      expect(screen.getByText("Your Permissions")).toBeInTheDocument();
    });
    expect(screen.getAllByText("Guest").length).toBeGreaterThan(0);
    expect(screen.queryByText("Manager")).not.toBeInTheDocument();
    expect(screen.getByText(/You do not have permission to manage roles/)).toBeInTheDocument();
  });

  it("shows the current signed-in role for every viewer", async () => {
    state.role = "Manager";
    setPermissionsTab();
    render(<SettingsSection />);

    await waitFor(() => {
      expect(screen.getByText(/Signed in as/)).toHaveTextContent("Signed in as Manager");
    });
  });
});
