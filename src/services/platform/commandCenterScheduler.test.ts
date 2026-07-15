import { afterEach, describe, expect, it, vi } from "vitest";
import { persistAllTenantCommandCenterSnapshots, persistCommandCenterSnapshot, shouldPersistCommandCenterSnapshot } from "./commandCenterScheduler";

describe("command center scheduler", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("evaluates snapshot intervals", () => {
    expect(shouldPersistCommandCenterSnapshot({ now: "2026-07-15T12:00:00.000Z" })).toBe(true);
    expect(shouldPersistCommandCenterSnapshot({
      lastSnapshotAt: "2026-07-15T11:00:00.000Z",
      now: "2026-07-15T12:00:00.000Z",
      intervalHours: 24,
    })).toBe(false);
  });

  it("builds a snapshot even when persistence is provider-gated", async () => {
    const result = await persistCommandCenterSnapshot({
      organizationId: "org-1",
      userId: "user-1",
      userRole: "Organization Admin",
      env: {} as NodeJS.ProcessEnv,
      seededPilotEvidence: true,
    });

    expect(result.snapshot.organizationId).toBe("org-1");
    expect(result.persisted).toBe(false);
  });

  it("keeps all-tenant fan-out provider-gated without Supabase admin credentials", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

    const result = await persistAllTenantCommandCenterSnapshots({
      env: {} as NodeJS.ProcessEnv,
      seededPilotEvidence: true,
    });

    expect(result.persisted).toBe(false);
    expect(result.tenantsProcessed).toBe(0);
    expect(result.reason).toContain("Supabase admin runtime");
  });
});
