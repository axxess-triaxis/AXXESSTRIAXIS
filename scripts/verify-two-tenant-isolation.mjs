#!/usr/bin/env node
// Sprint 5, F-021/gap-analysis follow-up: a scripted, repeatable two-tenant isolation harness.
//
// Everything the QA remediation program has said about tenant isolation before this sprint was
// proven at the unit-test / static-RLS-policy level only (supabaseEnterpriseRepositories.test.ts,
// tenantGuard.test.ts) -- never against a real, running Supabase project with two real tenants
// exercising real RLS policies end to end. This script closes that gap by:
//
//   1. Creating two throwaway organizations ("tenant A" and "tenant B") and one real Supabase Auth
//      user per organization, each granted the "Organization Admin" role in their own org only.
//   2. Signing in as each user to obtain a real access token (exactly what a browser session has).
//   3. As tenant A's user: creating one project, task, document and knowledge article, then writing
//      one audit_logs row and one workflow_timeline_events row for the created project.
//   4. As tenant B's user: attempting to (a) list/read tenant A's records and (b) update one of them
//      by ID -- both using PostgREST directly with tenant B's own access token, so real RLS policies
//      decide the outcome, not application code.
//   5. Recording PASS/FAIL per resource type and printing a JSON summary.
//   6. Best-effort cleanup of every row and both auth users/organizations it created.
//
// THIS SCRIPT HAS NOT BEEN RUN AGAINST A LIVE OR BRANCH SUPABASE PROJECT AS PART OF SPRINT 5.
// This checkout has no linked remote Supabase project (see docs/SUPABASE_CLI.md) and no local
// Docker daemon was available in this session's environment (`docker info` failed). Do not treat
// this script's existence as equivalent to a passing run -- only an actual execution, with its
// printed JSON result attached to a sprint closeout, counts as "two-tenant isolation verified."
//
// ## How to run this against local Supabase (requires Docker):
//   1. pnpm exec supabase start
//   2. pnpm run supabase:db:reset   (applies all migrations + seed data locally)
//   3. Export NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
//      from `supabase status` output (or `pnpm exec supabase status -o env`)
//   4. node scripts/verify-two-tenant-isolation.mjs
//   5. pnpm exec supabase stop --no-backup
//
// ## How to run this against a linked remote/branch Supabase project:
//   1. pnpm run supabase:link -- --project-ref <project-ref>
//   2. Pull the project's own URL/anon key/service-role key into your shell environment (from the
//      Supabase dashboard, or `vercel env pull` if the same project backs the linked Vercel project)
//   3. node scripts/verify-two-tenant-isolation.mjs
//   Never run this against a real production project with real tenant data -- it creates and then
//   deletes real rows. Use a dedicated test/staging project or a local/branch database only.
//
// ## Required environment variables:
//   NEXT_PUBLIC_SUPABASE_URL       (or SUPABASE_URL)
//   NEXT_PUBLIC_SUPABASE_ANON_KEY  (or SUPABASE_ANON_KEY)
//   SUPABASE_SERVICE_ROLE_KEY
//
// ## What proves success:
//   The printed JSON's `status` field is "passed" only if every resource type in
//   REQUIRED_COVERAGE reports both `crossTenantReadBlocked: true` and `crossTenantWriteBlocked:
//   true`. Any `false` there is a real tenant-isolation failure and must block a release, not be
//   waved through.

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "").replace(/\/$/, "");
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const REQUIRED_COVERAGE = ["projects", "tasks", "documents", "knowledge_articles", "audit_logs", "workflow_timeline_events"];

function requireConfig() {
  const missing = [];
  if (!SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)");
  if (!ANON_KEY) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_ANON_KEY)");
  if (!SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (missing.length > 0) {
    console.error("[two-tenant-isolation] Missing required environment variables:");
    for (const item of missing) console.error(`  - ${item}`);
    console.error("\nSee the header of this script for how to obtain these locally or against a linked project.");
    process.exit(1);
  }
}

async function adminRequest(path, { method = "GET", body, prefer } = {}) {
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  const json = text ? JSON.parse(text) : undefined;
  if (!response.ok) {
    throw new Error(`Admin request failed: ${method} ${path} -> ${response.status} ${text}`);
  }
  return json;
}

async function userRequest(accessToken, path, { method = "GET", body, prefer } = {}) {
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  const json = text ? JSON.parse(text) : undefined;
  return { ok: response.ok, status: response.status, body: json };
}

async function createTestUser(email, password) {
  const user = await adminRequest("/auth/v1/admin/users", {
    method: "POST",
    body: { email, password, email_confirm: true },
  });
  return user.id ?? user.user?.id;
}

async function signIn(email, password) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(`Sign-in failed for ${email}: ${response.status} ${JSON.stringify(json)}`);
  return json.access_token;
}

async function setUpTenant(label, runId) {
  const slug = `qa-isolation-${runId}-${label}`;
  const email = `qa-isolation-${runId}-${label}@axxess-test.invalid`;
  const password = `Test-${runId}-${label}-Pw1!`;

  const [org] = await adminRequest("/rest/v1/organizations", {
    method: "POST",
    prefer: "return=representation",
    body: { name: `QA Isolation Test Org ${label.toUpperCase()} (${runId})`, slug, sector: "other" },
  });

  const userId = await createTestUser(email, password);
  await adminRequest("/rest/v1/profiles", {
    method: "POST",
    prefer: "return=minimal",
    body: { id: userId, email, display_name: `QA Isolation Tester ${label.toUpperCase()}`, avatar_initials: "QA" },
  });
  await adminRequest("/rest/v1/organization_members", {
    method: "POST",
    prefer: "return=minimal",
    body: { organization_id: org.id, user_id: userId, status: "active" },
  });
  const [role] = await adminRequest("/rest/v1/roles", {
    method: "POST",
    prefer: "return=representation",
    body: { organization_id: org.id, name: "Organization Admin" },
  });
  await adminRequest("/rest/v1/user_roles", {
    method: "POST",
    prefer: "return=minimal",
    body: { organization_id: org.id, user_id: userId, role_id: role.id },
  });

  const accessToken = await signIn(email, password);
  return { orgId: org.id, userId, email, roleId: role.id, accessToken };
}

async function cleanUpTenant(tenant) {
  const errors = [];
  try { await adminRequest(`/rest/v1/organizations?id=eq.${tenant.orgId}`, { method: "DELETE" }); } catch (error) { errors.push(String(error)); }
  try { await adminRequest(`/auth/v1/admin/users/${tenant.userId}`, { method: "DELETE" }); } catch (error) { errors.push(String(error)); }
  try { await adminRequest(`/rest/v1/profiles?id=eq.${tenant.userId}`, { method: "DELETE" }); } catch (error) { errors.push(String(error)); }
  return errors;
}

async function checkResourceIsolation(tenantA, tenantB, config) {
  const result = { resource: config.resource, created: false, crossTenantReadBlocked: null, crossTenantWriteBlocked: null, error: null };
  try {
    const createResponse = await userRequest(tenantA.accessToken, `/rest/v1/${config.resource}`, {
      method: "POST",
      prefer: "return=representation",
      body: config.createBody(tenantA),
    });
    if (!createResponse.ok) throw new Error(`Tenant A could not create a ${config.resource} row: ${createResponse.status} ${JSON.stringify(createResponse.body)}`);
    const created = Array.isArray(createResponse.body) ? createResponse.body[0] : createResponse.body;
    result.created = true;

    const readAsB = await userRequest(tenantB.accessToken, `/rest/v1/${config.resource}?id=eq.${created.id}`);
    const visibleToB = Array.isArray(readAsB.body) && readAsB.body.length > 0;
    result.crossTenantReadBlocked = !visibleToB;

    const writeAsB = await userRequest(tenantB.accessToken, `/rest/v1/${config.resource}?id=eq.${created.id}`, {
      method: "PATCH",
      prefer: "return=representation",
      body: config.updateBody,
    });
    const mutatedByB = writeAsB.ok && Array.isArray(writeAsB.body) && writeAsB.body.length > 0;
    result.crossTenantWriteBlocked = !mutatedByB;
  } catch (error) {
    result.error = String(error?.message ?? error);
  }
  return result;
}

async function main() {
  requireConfig();
  const runId = Date.now().toString(36);
  console.log(`[two-tenant-isolation] Starting run ${runId} against ${SUPABASE_URL}`);

  const tenantA = await setUpTenant("a", runId);
  const tenantB = await setUpTenant("b", runId);
  console.log(`[two-tenant-isolation] Tenant A org=${tenantA.orgId} user=${tenantA.userId}`);
  console.log(`[two-tenant-isolation] Tenant B org=${tenantB.orgId} user=${tenantB.userId}`);

  const resourceConfigs = [
    {
      resource: "projects",
      createBody: (tenant) => ({ organization_id: tenant.orgId, name: `Isolation test project ${runId}`, owner_id: tenant.userId }),
      updateBody: { name: "Mutated by tenant B" },
    },
    {
      resource: "tasks",
      createBody: (tenant) => ({ organization_id: tenant.orgId, title: `Isolation test task ${runId}`, assignee_id: tenant.userId }),
      updateBody: { title: "Mutated by tenant B" },
    },
    {
      resource: "documents",
      createBody: (tenant) => ({ organization_id: tenant.orgId, name: `Isolation test doc ${runId}`, storage_path: `qa-isolation/${runId}.txt`, mime_type: "text/plain", created_by: tenant.userId }),
      updateBody: { name: "Mutated by tenant B" },
    },
    {
      resource: "knowledge_articles",
      createBody: (tenant) => ({ organization_id: tenant.orgId, title: `Isolation test article ${runId}`, status: "draft" }),
      updateBody: { title: "Mutated by tenant B" },
    },
    {
      resource: "audit_logs",
      createBody: (tenant) => ({ organization_id: tenant.orgId, actor_user_id: tenant.userId, action: "isolation.test", resource_type: "project", metadata: { runId } }),
      updateBody: { metadata: { mutated_by_b: true } },
    },
    {
      resource: "workflow_timeline_events",
      createBody: (tenant) => ({ organization_id: tenant.orgId, resource_type: "project", event_type: "workflow_action_created", title: `Isolation test event ${runId}`, actor_user_id: tenant.userId }),
      updateBody: { title: "Mutated by tenant B" },
    },
  ];

  const results = [];
  for (const config of resourceConfigs) {
    console.log(`[two-tenant-isolation] Checking ${config.resource}...`);
    results.push(await checkResourceIsolation(tenantA, tenantB, config));
  }

  console.log("[two-tenant-isolation] Cleaning up test tenants...");
  const cleanupErrors = [...(await cleanUpTenant(tenantA)), ...(await cleanUpTenant(tenantB))];

  const coverageMissing = REQUIRED_COVERAGE.filter((resource) => !results.some((result) => result.resource === resource));
  const failures = results.filter((result) => result.error || result.crossTenantReadBlocked === false || result.crossTenantWriteBlocked === false);

  const summary = {
    status: failures.length === 0 && coverageMissing.length === 0 ? "passed" : "failed",
    runId,
    supabaseUrl: SUPABASE_URL,
    results,
    coverageMissing,
    cleanupErrors,
  };

  console.log(JSON.stringify(summary, null, 2));
  if (summary.status !== "passed") process.exitCode = 1;
}

main().catch((error) => {
  console.error("[two-tenant-isolation] Fatal error:", error);
  process.exitCode = 1;
});
