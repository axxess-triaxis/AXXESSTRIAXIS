import { describe, expect, it, vi } from "vitest";

// A-36/A-37 fix: these routes used to redirect("/settings") with no tab intent, which landed on
// the Security tab by default (SettingsSection's useState("security")) regardless of why the
// admin got here. Both real destinations (invite UI and per-user role change) live in the Users
// tab -- see SettingsSection.tsx's UserAdministration component.
const redirectSpy = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: redirectSpy,
}));

describe("admin redirect pages route to the real Users tab, not bare /settings", () => {
  it("/admin/invitations redirects to /settings?tab=users", async () => {
    redirectSpy.mockClear();
    const { default: AdminInvitationsPage } = await import("./invitations/page");
    AdminInvitationsPage();
    expect(redirectSpy).toHaveBeenCalledWith("/settings?tab=users");
  });

  it("/admin/roles redirects to /settings?tab=users", async () => {
    redirectSpy.mockClear();
    const { default: AdminRolesPage } = await import("./roles/page");
    AdminRolesPage();
    expect(redirectSpy).toHaveBeenCalledWith("/settings?tab=users");
  });
});
