import { isSupabaseAdminConfigured, supabaseAdminRest } from "./supabaseAdmin";
import type { CustomerSuccessLiveOpsSnapshot } from "../services/pilot/customerSuccessLiveOps";

type SnapshotRow = {
  id: string;
};

export type PersistCustomerSuccessLiveOpsInput = {
  snapshot: CustomerSuccessLiveOpsSnapshot;
  userId: string;
};

export type PersistCustomerSuccessLiveOpsResult = {
  persisted: boolean;
  reason?: string;
  snapshotId?: string;
};

export async function persistCustomerSuccessLiveOpsSnapshot(input: PersistCustomerSuccessLiveOpsInput): Promise<PersistCustomerSuccessLiveOpsResult> {
  if (!isSupabaseAdminConfigured()) {
    return {
      persisted: false,
      reason: "Supabase admin runtime is not configured.",
    };
  }

  const { snapshot } = input;
  const rows = await supabaseAdminRest<SnapshotRow[]>("customer_success_live_ops_snapshots", {
    method: "POST",
    body: {
      organization_id: snapshot.organizationId,
      generated_by_user_id: input.userId,
      organization_name: snapshot.organizationName,
      status: snapshot.status,
      score: snapshot.score,
      generated_at: snapshot.generatedAt,
      recovery_items: snapshot.recoveryItems,
      sla_timers: snapshot.slaTimers,
      regional_key_policies: snapshot.regionalKeyPolicies,
      recommendations: snapshot.recommendations,
      metadata: {
        metrics: snapshot.metrics,
        source: "sprint_30_customer_success_live_ops",
      },
    },
  });
  const snapshotId = rows?.[0]?.id;

  if (snapshotId && snapshot.recoveryItems.length) {
    await supabaseAdminRest("customer_success_recovery_items", {
      method: "POST",
      body: snapshot.recoveryItems.map((item) => ({
        organization_id: snapshot.organizationId,
        snapshot_id: snapshotId,
        workflow_step_id: item.workflowStepId,
        title: item.title,
        severity: item.severity,
        status: item.status,
        owner_role: item.ownerRole,
        route: item.route,
        due_at: item.dueAt,
        evidence: item.evidence,
        metadata: item.metadata,
      })),
    });
  }

  if (snapshotId && snapshot.slaTimers.length) {
    await supabaseAdminRest("customer_success_sla_timers", {
      method: "POST",
      body: snapshot.slaTimers.map((timer) => ({
        organization_id: snapshot.organizationId,
        snapshot_id: snapshotId,
        timer_key: timer.timerKey,
        label: timer.label,
        status: timer.status,
        owner_role: timer.ownerRole,
        route: timer.route,
        starts_at: timer.startsAt,
        due_at: timer.dueAt,
        breached_at: timer.breachedAt ?? null,
        evidence: timer.evidence,
        metadata: timer.metadata,
      })),
    });
  }

  if (snapshotId && snapshot.regionalKeyPolicies.length) {
    await supabaseAdminRest("regional_key_policies", {
      method: "POST",
      body: snapshot.regionalKeyPolicies.map((policy) => ({
        organization_id: snapshot.organizationId,
        snapshot_id: snapshotId,
        region_code: policy.regionCode,
        policy_name: policy.policyName,
        key_scope: policy.keyScope,
        status: policy.status,
        key_owner_role: policy.keyOwnerRole,
        rotation_days: policy.rotationDays,
        residency_note: policy.residencyNote,
        metadata: policy.metadata,
      })),
    });
  }

  return {
    persisted: true,
    snapshotId,
  };
}
