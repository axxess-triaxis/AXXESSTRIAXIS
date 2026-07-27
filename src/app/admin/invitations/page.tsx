import { redirect } from "next/navigation";

// Admin panel wiring pass (2026-07-25): reported live at
// https://triaxis-www-frontend-import.vercel.app/admin/invitations as "still just placeholder".
// This route used to render EnterpriseAdminPage's dead-button "invitations" panel.
// SettingsSection.tsx (reached via /settings) already has real, tested invite-user and
// pending-invitations UI, now with a real Revoke action added -- redirecting here instead of
// building a second, competing invitation-management surface.
// A-36 fix (2026-07-27): redirecting to bare /settings landed on the Security tab by default,
// not the Users tab where the invite UI actually lives -- pass the intended tab explicitly.
export default function AdminInvitationsPage() {
  redirect("/settings?tab=users");
}
