import type { UserContext } from "../../security/rbac";
import type { AuditLogInput } from "../../repositories/interfaces";
import { auditLogsRepository, tenantScopeFromUser } from "../../repositories/supabaseEnterpriseRepositories";

type AuditSession = { accessToken: string; user: UserContext };

// An audit failure never fails the action it describes, but it is no longer silent: M20 in
// docs/readiness/STACK_PERSONA_ORCHESTRATION_AUDIT_2026_11_05.md went unnoticed because callers
// discarded these errors.
export async function recordAuditBestEffort(session: AuditSession, input: AuditLogInput) {
  try {
    await auditLogsRepository.record(tenantScopeFromUser(session.user, session.accessToken), input);
  } catch (error) {
    console.error(`[audit] failed to record ${input.action}:`, error instanceof Error ? error.message : error);
  }
}

// Call for refused WRITES only. Pages make refused reads routinely, which would flood the log.
export async function recordDeniedAttempt(
  session: AuditSession,
  attempt: { route: string; method: string; attemptedRole?: string },
) {
  await recordAuditBestEffort(session, {
    action: "access.denied",
    resourceType: "route",
    category: "access-control",
    metadata: {
      route: attempt.route,
      method: attempt.method,
      role: session.user.role,
      ...(attempt.attemptedRole ? { attemptedRole: attempt.attemptedRole } : {}),
    },
  });
}

// PostgreSQL insufficient_privilege, raised by RLS and by the Super Admin guard triggers.
export function isDatabaseRefusal(error: unknown) {
  return error instanceof Error && error.message.includes("42501");
}
