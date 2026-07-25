import { redirect } from "next/navigation";

// Admin panel wiring pass (2026-07-25): reported live at
// https://triaxis-www-frontend-import.vercel.app/admin/invitations as "still just placeholder".
// This route used to render EnterpriseAdminPage's dead-button "invitations" panel.
// SettingsSection.tsx (reached via /settings) already has real, tested invite-user and
// pending-invitations UI, now with a real Revoke action added -- redirecting here instead of
// building a second, competing invitation-management surface.
export default function AdminInvitationsPage() {
  redirect("/settings");
}
