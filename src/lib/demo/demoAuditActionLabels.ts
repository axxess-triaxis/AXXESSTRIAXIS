// A-96 (2026-08-04): shared investor-demo-only friendly-label map for raw audit action codes
// (e.g. "rag.answer.generated") -- founder feedback: raw dot-notation codes read as an internal
// engineering tracker, not a finished product. Used by AuditLogsSection.tsx and
// OrganizationAdminSection.tsx so both pages describe the same 680-row seeded dataset
// (demoDataset.ts's auditLogTemplates) consistently. Real tenants' own audit logs are never routed
// through this map -- callers gate usage behind isDemoModeEnabled(), same as every other demo-only
// fixture in this codebase.
export const demoAuditActionLabels: Record<string, string> = {
  "project.updated": "Project details updated",
  "project.status_changed": "Project status changed",
  "task.completed": "Task marked complete",
  "task.assigned": "Task assigned to a team member",
  "task.overdue_flagged": "Overdue task flagged for follow-up",
  "document.viewed": "Document opened",
  "document.uploaded": "Document uploaded",
  "document.shared": "Document shared with team",
  "rag.answer.generated": "AI answer generated and reviewed",
  "rag.source.cited": "AI answer cited a source document",
  "approval.changed": "Approval decision recorded",
  "approval.requested": "Approval requested",
  "approval.escalated": "Approval escalated for review",
  "permission.changed": "Access permissions updated",
  "auth.mfa_enrolled": "Two-factor authentication enrolled",
  "auth.session_refreshed": "Session security refreshed",
  "meeting.completed": "Meeting completed with recorded outcomes",
  "meeting.notes_published": "Meeting notes published",
  "stakeholder.contacted": "Stakeholder follow-up logged",
  "invitation.accepted": "Team invitation accepted",
};
