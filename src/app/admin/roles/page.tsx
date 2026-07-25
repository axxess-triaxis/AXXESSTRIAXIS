import { redirect } from "next/navigation";

// Admin panel wiring pass (2026-07-25): this route used to render EnterpriseAdminPage's
// dead-button "roles" panel. SettingsSection.tsx (reached via /settings) already has real,
// tested role-assignment UI gated to Super Admin/Organization Admin -- redirecting here instead
// of building a second, competing role-management surface.
export default function AdminRolesPage() {
  redirect("/settings");
}
