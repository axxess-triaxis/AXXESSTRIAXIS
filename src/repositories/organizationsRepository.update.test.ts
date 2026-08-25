import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TenantScope } from "./interfaces";

// MN-8 (2026-08-24): regression test for the real bug found and fixed while adding
// organizationsRepository.update -- organizations has no organization_id column (its own `id` IS
// the tenant id), so the shared updateResource() pattern's tenant filter
// (`if (scope.role !== "Super Admin") params.set("organization_id", ...)`) would produce an
// "unknown column organization_id" PostgREST error for a non-Super-Admin caller. This repository
// uses a dedicated updateOrganization() function specifically to avoid that filter -- this test
// locks in that no organization_id param is ever sent, for any role.
describe("organizationsRepository.update (MN-8 organization_id-filter regression)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("sends no organization_id filter for a non-Super-Admin caller (the exact bug this fixes)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ id: "org-1", name: "Real Org", slug: "real-org", sector: "enterprise", logo_path: "organizations/org-1/logo/x.png", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" }]), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { organizationsRepository } = await import("./supabaseEnterpriseRepositories");
    const scope: TenantScope = { organizationId: "org-1", userId: "user-1", role: "Organization Admin", accessToken: "token-abc" };

    const result = await organizationsRepository.update(scope, "org-1", { logoPath: "organizations/org-1/logo/x.png" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const requestUrl = String(fetchMock.mock.calls[0][0]);
    expect(requestUrl).toContain("id=eq.org-1");
    expect(requestUrl).not.toContain("organization_id");
    expect(result.logoPath).toBe("organizations/org-1/logo/x.png");
  });

  it("sends no organization_id filter for a Super Admin caller either (same code path, no branch to diverge)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ id: "org-1", name: "Real Org", slug: "real-org", sector: "enterprise", logo_path: null, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" }]), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { organizationsRepository } = await import("./supabaseEnterpriseRepositories");
    const scope: TenantScope = { organizationId: "org-1", userId: "user-1", role: "Super Admin", accessToken: "token-abc" };

    await organizationsRepository.update(scope, "org-1", { logoPath: "organizations/org-1/logo/y.png" });

    const requestUrl = String(fetchMock.mock.calls[0][0]);
    expect(requestUrl).not.toContain("organization_id");
  });
});
