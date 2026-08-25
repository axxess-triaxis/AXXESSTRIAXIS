import { useMemo } from "react";
import { useAuth } from "../../auth/AuthProvider";
import { tenantScopeFromUser } from "../../repositories/supabaseEnterpriseRepositories";
import type { TenantScope } from "../../repositories/interfaces";

// MN-2 (2026-08-23): the exact same scope-resolution call every desktop feature section already
// uses (TasksSection.tsx, MeetingsSection.tsx, ProjectsSection.tsx, ApprovalsSection.tsx,
// StakeholdersSection.tsx all do `useMemo(() => user ? tenantScopeFromUser(user) : undefined,
// [user])` inline) -- pulled into one shared hook so every new mobile screen calls it identically
// rather than six copies drifting apart.
export function useMobileTenantScope(): TenantScope | undefined {
  const { session } = useAuth();
  const user = session.user;
  return useMemo(() => (user ? tenantScopeFromUser(user) : undefined), [user]);
}
