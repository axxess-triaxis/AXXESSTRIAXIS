import { isSupabaseAdminConfigured, supabaseAdminRest } from "./supabaseAdmin";
import type { MobileStoreLaunchSnapshot } from "../services/mobile/mobileStoreLaunch";

type ReleaseRunRow = {
  id: string;
};

export type MobileStoreLaunchAction = "snapshot_recorded" | "reviewer_provisioned" | "rollout_updated";

export type PersistMobileStoreLaunchInput = {
  snapshot: MobileStoreLaunchSnapshot;
  userId: string;
  action: MobileStoreLaunchAction;
  note?: string;
};

export type PersistMobileStoreLaunchResult = {
  persisted: boolean;
  reason?: string;
  releaseRunId?: string;
};

export async function persistMobileStoreLaunchSnapshot(input: PersistMobileStoreLaunchInput): Promise<PersistMobileStoreLaunchResult> {
  if (!isSupabaseAdminConfigured()) {
    return {
      persisted: false,
      reason: "Supabase admin runtime is not configured.",
    };
  }

  const { snapshot } = input;
  const rows = await supabaseAdminRest<ReleaseRunRow[]>("mobile_release_runs", {
    method: "POST",
    body: {
      organization_id: snapshot.organizationId,
      generated_by_user_id: input.userId,
      status: snapshot.status,
      readiness_score: snapshot.readinessScore,
      app_version: snapshot.appVersion,
      build_readiness: snapshot.buildReadiness,
      store_listings: snapshot.storeListings,
      reviewer_account: snapshot.reviewerAccount,
      screenshot_manifest: snapshot.screenshotManifest,
      release_health: snapshot.releaseHealth,
      rollout_plan: snapshot.rolloutPlan,
      release_gates: snapshot.releaseGates,
      next_actions: snapshot.nextActions,
      metadata: {
        action: input.action,
        note: input.note,
        organizationName: snapshot.organizationName,
        source: "sprint_32_mobile_store_launch_console",
      },
    },
  });
  const releaseRunId = rows?.[0]?.id;

  if (releaseRunId && snapshot.storeListings.length) {
    await supabaseAdminRest("mobile_store_listings", {
      method: "POST",
      body: snapshot.storeListings.map((listing) => ({
        organization_id: snapshot.organizationId,
        release_run_id: releaseRunId,
        platform: listing.platform,
        title: listing.title,
        subtitle: listing.subtitle,
        description: listing.description,
        support_url: listing.supportUrl,
        privacy_url: listing.privacyUrl,
        status: listing.status,
        screenshot_status: listing.screenshotStatus,
        privacy_status: listing.privacyStatus,
        reviewer_notes_status: listing.reviewerNotesStatus,
        evidence: listing.evidence,
        metadata: {},
      })),
    });
  }

  if (releaseRunId) {
    await supabaseAdminRest("mobile_reviewer_accounts", {
      method: "POST",
      body: {
        organization_id: snapshot.organizationId,
        release_run_id: releaseRunId,
        email: snapshot.reviewerAccount.email,
        role_name: snapshot.reviewerAccount.role,
        status: snapshot.reviewerAccount.status,
        last_verified_at: snapshot.reviewerAccount.lastVerifiedAt,
        password_rotation_due_at: snapshot.reviewerAccount.passwordRotationDueAt,
        checklist: snapshot.reviewerAccount.checklist,
        metadata: {
          action: input.action,
        },
      },
    });
  }

  if (releaseRunId && snapshot.releaseHealth.monitors.length) {
    await supabaseAdminRest("mobile_crash_events", {
      method: "POST",
      body: snapshot.releaseHealth.monitors.map((monitor) => ({
        organization_id: snapshot.organizationId,
        release_run_id: releaseRunId,
        platform: "webview",
        severity: monitor.status === "blocked" ? "critical" : monitor.status === "watch" ? "warning" : "info",
        event_key: monitor.id,
        status: monitor.status === "blocked" ? "open" : monitor.status === "watch" ? "monitoring" : "resolved",
        event_count: monitor.id === "auth-failures" ? snapshot.releaseHealth.failedLoginAttempts : 0,
        crash_free_sessions: snapshot.releaseHealth.crashFreeSessions,
        metadata: {
          label: monitor.label,
          detail: monitor.detail,
          webviewErrorRate: snapshot.releaseHealth.webviewErrorRate,
          apiP95Ms: snapshot.releaseHealth.apiP95Ms,
        },
      })),
    });
  }

  if (releaseRunId && snapshot.rolloutPlan.length) {
    await supabaseAdminRest("mobile_rollout_events", {
      method: "POST",
      body: snapshot.rolloutPlan.map((step) => ({
        organization_id: snapshot.organizationId,
        release_run_id: releaseRunId,
        platform: step.platform,
        track: step.track,
        status: step.status,
        rollout_percent: step.rolloutPercent,
        countries: step.countries,
        action: input.action,
        actor_user_id: input.userId,
        evidence: step.evidence,
        metadata: {
          ownerRole: step.ownerRole,
          note: input.note,
        },
      })),
    });
  }

  return {
    persisted: true,
    releaseRunId,
  };
}
