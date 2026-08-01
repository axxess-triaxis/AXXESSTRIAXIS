import { redirect } from "next/navigation";

// Admin panel wiring pass (2026-07-25): this route used to render EnterpriseAdminPage's
// dead-button "roles" panel. SettingsSection.tsx (reached via /settings) already has real,
// tested role-assignment UI gated to Super Admin/Organization Admin -- redirecting here instead
// of building a second, competing role-management surface.
// A-37 fix (2026-07-27): the real per-user role-change control lives in the Users tab
// (UserAdministration's role select), not the Permissions tab (a static read-only matrix) --
// and redirecting to bare /settings landed on Security by default either way.
export default function AdminRolesPage() {
  redirect("/settings?tab=users");
}
